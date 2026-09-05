-- Migration: 00047_atomic_pos_checkout_rpc.sql
-- Description: Atomic POS Transaction Checkout RPC with Server-Side Price & HPP Authority, Payload Idempotency, Discount Validation & Audit Logging

CREATE OR REPLACE FUNCTION public.create_pos_transaction(
    p_branch_id UUID,
    p_items JSONB,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method VARCHAR DEFAULT 'cash',
    p_header_discount NUMERIC DEFAULT 0,
    p_client_trx_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_business_id UUID;
    v_branch_business UUID;
    v_kasir_id UUID;
    v_trx_id UUID;
    v_subtotal NUMERIC(15,2) := 0;
    v_total_amount NUMERIC(15,2) := 0;
    v_item RECORD;
    v_unit_price NUMERIC(15,2);
    v_unit_hpp NUMERIC(15,2);
    v_price_override NUMERIC(15,2);
    v_item_subtotal NUMERIC(15,2);
    v_result JSONB;
    v_existing_trx RECORD;
    v_existing_items_json JSONB;
    v_new_items_json JSONB;
BEGIN
    -- 1. Validate authenticated context & business_id
    v_business_id := public.auth_current_business_id();
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request: missing business_id'
            USING ERRCODE = '28000';
    END IF;

    -- 2. Validate Branch Tenant Ownership & Authorization
    SELECT business_id INTO v_branch_business
    FROM public.branches
    WHERE id = p_branch_id;

    IF v_branch_business IS NULL OR v_branch_business <> v_business_id THEN
        RAISE EXCEPTION 'Branch % does not belong to business_id %', p_branch_id, v_business_id
            USING ERRCODE = '42501';
    END IF;

    v_kasir_id := auth.uid();
    IF NOT public.auth_user_has_branch_access(p_branch_id) THEN
        RAISE EXCEPTION 'Unauthorized branch access for branch_id %', p_branch_id
            USING ERRCODE = '42501';
    END IF;

    IF NOT public.auth_has_permission('transaction:create') THEN
        RAISE EXCEPTION 'Missing permission: transaction:create'
            USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Customer Tenant Ownership (if supplied)
    IF p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.customers 
            WHERE id = p_customer_id AND business_id = v_business_id
        ) THEN
            RAISE EXCEPTION 'Invalid customer_id % for business_id %', p_customer_id, v_business_id
                USING ERRCODE = '22000';
        END IF;
    END IF;

    -- 4. Validate Items Array Non-Empty
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Transaction must contain at least one item'
            USING ERRCODE = '22000';
    END IF;

    -- 5. SERVER-SIDE PRICING, HPP & DISCOUNT VALIDATION LOOP
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        service_id UUID,
        qty INT,
        discount NUMERIC
    ) LOOP
        IF v_item.qty IS NULL OR v_item.qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero'
                USING ERRCODE = '22000';
        END IF;

        IF COALESCE(v_item.discount, 0) < 0 THEN
            RAISE EXCEPTION 'Item discount cannot be negative'
                USING ERRCODE = '22000';
        END IF;

        -- Authoritative Service Catalog & Price Lookup (Branch Override -> Master Catalog)
        SELECT base_harga, hpp INTO v_unit_price, v_unit_hpp
        FROM public.services
        WHERE id = v_item.service_id AND business_id = v_business_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Service_id % not found in catalog for tenant', v_item.service_id
                USING ERRCODE = '22000';
        END IF;

        -- Check branch price override
        SELECT price_override INTO v_price_override
        FROM public.branch_services
        WHERE branch_id = p_branch_id AND service_id = v_item.service_id AND is_active = true AND business_id = v_business_id;

        IF v_price_override IS NOT NULL THEN
            v_unit_price := v_price_override;
        END IF;

        IF COALESCE(v_item.discount, 0) > (v_item.qty * v_unit_price) THEN
            RAISE EXCEPTION 'Item discount (%) exceeds line gross amount (%) for service %', COALESCE(v_item.discount, 0), (v_item.qty * v_unit_price), v_item.service_id
                USING ERRCODE = '22000';
        END IF;

        v_item_subtotal := (v_item.qty * v_unit_price) - COALESCE(v_item.discount, 0);
        v_subtotal := v_subtotal + v_item_subtotal;
    END LOOP;

    -- 6. Header Discount Validation & Total Calculation
    IF COALESCE(p_header_discount, 0) < 0 THEN
        RAISE EXCEPTION 'Header discount cannot be negative'
            USING ERRCODE = '22000';
    END IF;

    IF COALESCE(p_header_discount, 0) > v_subtotal THEN
        RAISE EXCEPTION 'Header discount (%) exceeds subtotal (%)', COALESCE(p_header_discount, 0), v_subtotal
            USING ERRCODE = '22000';
    END IF;

    v_total_amount := v_subtotal - COALESCE(p_header_discount, 0);

    -- 7. Idempotency Payload Integrity Check
    IF p_client_trx_id IS NOT NULL THEN
        SELECT id, business_id, branch_id, customer_id, total_amount, payment_method, discount, subtotal, status
        INTO v_existing_trx
        FROM public.transactions
        WHERE id = p_client_trx_id;

        IF FOUND THEN
            -- Compare Canonical Header Values
            IF v_existing_trx.business_id = v_business_id AND
               v_existing_trx.branch_id = p_branch_id AND
               (v_existing_trx.customer_id IS NOT DISTINCT FROM p_customer_id) AND
               v_existing_trx.payment_method = p_payment_method AND
               v_existing_trx.discount = COALESCE(p_header_discount, 0) AND
               v_existing_trx.subtotal = v_subtotal THEN

                -- Compare Canonical Items Payloads
                SELECT jsonb_agg(jsonb_build_object('service_id', service_id, 'qty', qty, 'discount', COALESCE(discount, 0)) ORDER BY service_id)
                INTO v_existing_items_json
                FROM public.transaction_items
                WHERE transaction_id = p_client_trx_id;

                SELECT jsonb_agg(jsonb_build_object('service_id', service_id, 'qty', qty, 'discount', COALESCE(discount, 0)) ORDER BY service_id)
                INTO v_new_items_json
                FROM jsonb_to_recordset(p_items) AS (service_id UUID, qty INT, discount NUMERIC);

                IF v_existing_items_json = v_new_items_json THEN
                    -- Return existing transaction safely
                    SELECT jsonb_build_object(
                        'id', t.id,
                        'business_id', t.business_id,
                        'branch_id', t.branch_id,
                        'customer_id', t.customer_id,
                        'kasir_employee_id', t.kasir_employee_id,
                        'subtotal', t.subtotal,
                        'discount', t.discount,
                        'total_amount', t.total_amount,
                        'payment_method', t.payment_method,
                        'status', t.status,
                        'created_at', t.created_at,
                        'updated_at', t.updated_at,
                        'items', (
                            SELECT jsonb_agg(jsonb_build_object(
                                'id', ti.id,
                                'transaction_id', ti.transaction_id,
                                'service_id', ti.service_id,
                                'qty', ti.qty,
                                'unit_price', ti.unit_price,
                                'unit_hpp', ti.unit_hpp,
                                'discount', ti.discount,
                                'subtotal', ti.subtotal
                            ))
                            FROM public.transaction_items ti
                            WHERE ti.transaction_id = t.id
                        )
                    ) INTO v_result
                    FROM public.transactions t
                    WHERE t.id = p_client_trx_id;

                    RETURN v_result;
                END IF;
            END IF;

            -- Payload conflict detected
            RAISE EXCEPTION 'Transaction ID collision: transaction % exists with different payload', p_client_trx_id
                USING ERRCODE = '23505';
        END IF;

        v_trx_id := p_client_trx_id;
    ELSE
        v_trx_id := gen_random_uuid();
    END IF;

    -- 8. Insert Transaction Header
    INSERT INTO public.transactions (
        id,
        business_id,
        branch_id,
        customer_id,
        kasir_employee_id,
        subtotal,
        discount,
        total_amount,
        payment_method,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_trx_id,
        v_business_id,
        p_branch_id,
        p_customer_id,
        v_kasir_id,
        v_subtotal,
        COALESCE(p_header_discount, 0),
        v_total_amount,
        p_payment_method,
        'COMPLETED',
        NOW(),
        NOW()
    );

    -- 9. Insert Transaction Items with Authoritative Server Price & HPP Snapshot
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        service_id UUID,
        qty INT,
        discount NUMERIC
    ) LOOP
        -- Server Authoritative Price & HPP
        SELECT base_harga, hpp INTO v_unit_price, v_unit_hpp
        FROM public.services
        WHERE id = v_item.service_id AND business_id = v_business_id;

        SELECT price_override INTO v_price_override
        FROM public.branch_services
        WHERE branch_id = p_branch_id AND service_id = v_item.service_id AND is_active = true AND business_id = v_business_id;

        IF v_price_override IS NOT NULL THEN
            v_unit_price := v_price_override;
        END IF;

        v_item_subtotal := (v_item.qty * v_unit_price) - COALESCE(v_item.discount, 0);

        INSERT INTO public.transaction_items (
            id,
            transaction_id,
            service_id,
            qty,
            unit_price,
            unit_hpp,
            discount,
            subtotal
        ) VALUES (
            gen_random_uuid(),
            v_trx_id,
            v_item.service_id,
            v_item.qty,
            v_unit_price,
            COALESCE(v_unit_hpp, 0),
            COALESCE(v_item.discount, 0),
            v_item_subtotal
        );
    END LOOP;

    -- 10. Record Audit Log
    INSERT INTO public.audit_logs (
        id,
        business_id,
        branch_id,
        actor_user_id,
        operation,
        entity,
        entity_id,
        payload_sanitized,
        created_at
    ) VALUES (
        gen_random_uuid(),
        v_business_id,
        p_branch_id,
        v_kasir_id,
        'TRANSACTION_CREATED',
        'transactions',
        v_trx_id,
        jsonb_build_object(
            'transaction_id', v_trx_id,
            'total_amount', v_total_amount,
            'payment_method', p_payment_method,
            'item_count', jsonb_array_length(p_items)
        ),
        NOW()
    );

    -- 11. Return Json Payload
    SELECT jsonb_build_object(
        'id', t.id,
        'business_id', t.business_id,
        'branch_id', t.branch_id,
        'customer_id', t.customer_id,
        'kasir_employee_id', t.kasir_employee_id,
        'subtotal', t.subtotal,
        'discount', t.discount,
        'total_amount', t.total_amount,
        'payment_method', t.payment_method,
        'status', t.status,
        'created_at', t.created_at,
        'updated_at', t.updated_at,
        'items', (
            SELECT jsonb_agg(jsonb_build_object(
                'id', ti.id,
                'transaction_id', ti.transaction_id,
                'service_id', ti.service_id,
                'qty', ti.qty,
                'unit_price', ti.unit_price,
                'unit_hpp', ti.unit_hpp,
                'discount', ti.discount,
                'subtotal', ti.subtotal
            ))
            FROM public.transaction_items ti
            WHERE ti.transaction_id = t.id
        )
    ) INTO v_result
    FROM public.transactions t
    WHERE t.id = v_trx_id;

    RETURN v_result;
END;
$$;
