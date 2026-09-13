-- Migration: 00049_add_hpp_mode_to_services.sql
-- Description: Add dual HPP mode support (PERCENTAGE vs ACTUAL_COST) to services catalog and update atomic POS checkout RPC

-- 1. ADD HPP MODE COLUMNS TO SERVICES TABLE
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS hpp_mode VARCHAR(20) NOT NULL DEFAULT 'ACTUAL_COST' CHECK (hpp_mode IN ('PERCENTAGE', 'ACTUAL_COST')),
ADD COLUMN IF NOT EXISTS hpp_percent NUMERIC(5, 2) DEFAULT 0 CHECK (hpp_percent >= 0 AND hpp_percent <= 100);

-- 2. RE-CREATE ATOMIC POS CHECKOUT RPC TO DYNAMICALLY COMPUTE UNIT HPP IF MODE IS PERCENTAGE
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
    v_total_hpp NUMERIC(15,2) := 0;
    v_item RECORD;
    v_unit_price NUMERIC(15,2);
    v_unit_hpp NUMERIC(15,2);
    v_hpp_mode VARCHAR(20);
    v_hpp_percent NUMERIC(5,2);
    v_price_override NUMERIC(15,2);
    v_item_subtotal NUMERIC(15,2);
    v_item_hpp NUMERIC(15,2);
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

    v_kasir_id := auth.uid();

    -- 2. Validate branch belongs to tenant
    SELECT business_id INTO v_branch_business
    FROM public.branches
    WHERE id = p_branch_id;

    IF v_branch_business IS NULL OR v_branch_business <> v_business_id THEN
        RAISE EXCEPTION 'Branch % does not belong to active tenant', p_branch_id
            USING ERRCODE = '42501';
    END IF;

    -- 3. Idempotency Check
    IF p_client_trx_id IS NOT NULL THEN
        SELECT id, total_amount, status, created_at
        INTO v_existing_trx
        FROM public.transactions
        WHERE id = p_client_trx_id AND business_id = v_business_id;

        IF v_existing_trx.id IS NOT NULL THEN
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', ti.id,
                    'service_id', ti.service_id,
                    'qty', ti.qty,
                    'unit_price', ti.unit_price,
                    'unit_hpp', ti.unit_hpp,
                    'discount', ti.discount,
                    'subtotal', ti.subtotal,
                    'line_hpp', (ti.qty * ti.unit_hpp)
                )
            ) INTO v_existing_items_json
            FROM public.transaction_items ti
            WHERE ti.transaction_id = v_existing_trx.id;

            RETURN jsonb_build_object(
                'transaction_id', v_existing_trx.id,
                'status', v_existing_trx.status,
                'total_amount', v_existing_trx.total_amount,
                'created_at', v_existing_trx.created_at,
                'is_idempotent_replay', true,
                'items', COALESCE(v_existing_items_json, '[]'::jsonb)
            );
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

        -- Authoritative Service Catalog & Price Lookup
        SELECT base_harga, hpp, COALESCE(hpp_mode, 'ACTUAL_COST'), COALESCE(hpp_percent, 0)
        INTO v_unit_price, v_unit_hpp, v_hpp_mode, v_hpp_percent
        FROM public.services
        WHERE id = v_item.service_id AND business_id = v_business_id;

        IF v_unit_price IS NULL THEN
            RAISE EXCEPTION 'Service_id % not found in catalog for tenant', v_item.service_id
                USING ERRCODE = '22000';
        END IF;

        -- Compute HPP from Percentage Mode if enabled
        IF v_hpp_mode = 'PERCENTAGE' AND v_hpp_percent > 0 THEN
            v_unit_hpp := ROUND((v_unit_price * v_hpp_percent) / 100.0, 2);
        END IF;

        -- Check branch price override
        SELECT price_override INTO v_price_override
        FROM public.branch_services
        WHERE branch_id = p_branch_id AND service_id = v_item.service_id AND is_active = true AND business_id = v_business_id;

        IF v_price_override IS NOT NULL THEN
            v_unit_price := v_price_override;
            -- Recompute percentage HPP based on override price if percentage mode
            IF v_hpp_mode = 'PERCENTAGE' AND v_hpp_percent > 0 THEN
                v_unit_hpp := ROUND((v_unit_price * v_hpp_percent) / 100.0, 2);
            END IF;
        END IF;

        IF COALESCE(v_item.discount, 0) > (v_item.qty * v_unit_price) THEN
            RAISE EXCEPTION 'Item discount (%) exceeds line gross amount (%) for service %', COALESCE(v_item.discount, 0), (v_item.qty * v_unit_price), v_item.service_id
                USING ERRCODE = '22000';
        END IF;

        v_item_subtotal := (v_item.qty * v_unit_price) - COALESCE(v_item.discount, 0);
        v_subtotal := v_subtotal + v_item_subtotal;
        v_total_hpp := v_total_hpp + (v_item.qty * COALESCE(v_unit_hpp, 0));
    END LOOP;

    -- Validate Header Discount
    IF COALESCE(p_header_discount, 0) < 0 THEN
        RAISE EXCEPTION 'Header discount cannot be negative'
            USING ERRCODE = '22000';
    END IF;

    IF COALESCE(p_header_discount, 0) > v_subtotal THEN
        RAISE EXCEPTION 'Header discount (%) cannot exceed items subtotal (%)', p_header_discount, v_subtotal
            USING ERRCODE = '22000';
    END IF;

    v_total_amount := v_subtotal - COALESCE(p_header_discount, 0);

    -- 6. INSERT TRANSACTION HEADER
    IF p_client_trx_id IS NOT NULL THEN
        v_trx_id := p_client_trx_id;
        INSERT INTO public.transactions (
            id, business_id, branch_id, customer_id, cashier_id,
            subtotal, discount, total_amount, payment_method, status, created_by
        ) VALUES (
            v_trx_id, v_business_id, p_branch_id, p_customer_id, v_kasir_id,
            v_subtotal, COALESCE(p_header_discount, 0), v_total_amount, LOWER(p_payment_method), 'COMPLETED', COALESCE(v_kasir_id::text, 'system')
        );
    ELSE
        INSERT INTO public.transactions (
            business_id, branch_id, customer_id, cashier_id,
            subtotal, discount, total_amount, payment_method, status, created_by
        ) VALUES (
            v_business_id, p_branch_id, p_customer_id, v_kasir_id,
            v_subtotal, COALESCE(p_header_discount, 0), v_total_amount, LOWER(p_payment_method), 'COMPLETED', COALESCE(v_kasir_id::text, 'system')
        )
        RETURNING id INTO v_trx_id;
    END IF;

    -- 7. INSERT TRANSACTION ITEMS & SNAPSHOT HPP
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (
        service_id UUID,
        qty INT,
        discount NUMERIC
    ) LOOP
        SELECT base_harga, hpp, COALESCE(hpp_mode, 'ACTUAL_COST'), COALESCE(hpp_percent, 0)
        INTO v_unit_price, v_unit_hpp, v_hpp_mode, v_hpp_percent
        FROM public.services
        WHERE id = v_item.service_id AND business_id = v_business_id;

        IF v_hpp_mode = 'PERCENTAGE' AND v_hpp_percent > 0 THEN
            v_unit_hpp := ROUND((v_unit_price * v_hpp_percent) / 100.0, 2);
        END IF;

        SELECT price_override INTO v_price_override
        FROM public.branch_services
        WHERE branch_id = p_branch_id AND service_id = v_item.service_id AND is_active = true AND business_id = v_business_id;

        IF v_price_override IS NOT NULL THEN
            v_unit_price := v_price_override;
            IF v_hpp_mode = 'PERCENTAGE' AND v_hpp_percent > 0 THEN
                v_unit_hpp := ROUND((v_unit_price * v_hpp_percent) / 100.0, 2);
            END IF;
        END IF;

        v_item_subtotal := (v_item.qty * v_unit_price) - COALESCE(v_item.discount, 0);

        INSERT INTO public.transaction_items (
            transaction_id, service_id, qty, unit_price, unit_hpp, discount, subtotal
        ) VALUES (
            v_trx_id, v_item.service_id, v_item.qty, v_unit_price, COALESCE(v_unit_hpp, 0), COALESCE(v_item.discount, 0), v_item_subtotal
        );
    END LOOP;

    -- Build items output JSON
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ti.id,
            'service_id', ti.service_id,
            'qty', ti.qty,
            'unit_price', ti.unit_price,
            'unit_hpp', ti.unit_hpp,
            'discount', ti.discount,
            'subtotal', ti.subtotal,
            'line_hpp', (ti.qty * ti.unit_hpp)
        )
    ) INTO v_new_items_json
    FROM public.transaction_items ti
    WHERE ti.transaction_id = v_trx_id;

    v_result := jsonb_build_object(
        'transaction_id', v_trx_id,
        'business_id', v_business_id,
        'branch_id', p_branch_id,
        'status', 'COMPLETED',
        'subtotal', v_subtotal,
        'header_discount', COALESCE(p_header_discount, 0),
        'total_amount', v_total_amount,
        'total_hpp', v_total_hpp,
        'gross_profit', (v_total_amount - v_total_hpp),
        'items', COALESCE(v_new_items_json, '[]'::jsonb),
        'created_at', NOW()
    );

    RETURN v_result;
END;
$$;
