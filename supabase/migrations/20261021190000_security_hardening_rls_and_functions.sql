-- Migration: 20261021190000_security_hardening_rls_and_functions.sql
-- Description: Security Hardening: Enable RLS on Unsecured Tables, Harden SECURITY DEFINER Functions with search_path & Boundary Checks, and Enforce Cross-Tenant & Cross-Branch Protection

BEGIN;

-- Production Safety: Set timeouts to avoid blocking live user transactions
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ============================================================================
-- 1. SECURE THREE UNPROTECTED TABLES (ENABLE RLS & DEFINE POLICIES)
-- ============================================================================

-- Table 1: tenant_feature_flags
ALTER TABLE IF EXISTS public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

-- Ensure Tenant User SELECT Policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'tenant_feature_flags' 
      AND policyname = 'ff_tenant_select'
  ) THEN
    CREATE POLICY ff_tenant_select ON public.tenant_feature_flags
      FOR SELECT TO authenticated
      USING (auth_current_business_id() = tenant_id);
  END IF;
END $$;

-- Table 2: business_calendar_rules
ALTER TABLE IF EXISTS public.business_calendar_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_rules_select_policy ON public.business_calendar_rules;
CREATE POLICY calendar_rules_select_policy ON public.business_calendar_rules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_calendar bc
      WHERE bc.id = calendar_id
        AND bc.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(bc.branch_id))
    )
  );

DROP POLICY IF EXISTS calendar_rules_manage_policy ON public.business_calendar_rules;
CREATE POLICY calendar_rules_manage_policy ON public.business_calendar_rules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_calendar bc
      WHERE bc.id = calendar_id
        AND bc.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR (public.auth_user_has_branch_access(bc.branch_id) AND public.auth_has_permission('org:branch:manage')))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_calendar bc
      WHERE bc.id = calendar_id
        AND bc.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR (public.auth_user_has_branch_access(bc.branch_id) AND public.auth_has_permission('org:branch:manage')))
    )
  );

-- Table 3: business_calendar_exceptions
ALTER TABLE IF EXISTS public.business_calendar_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calendar_exceptions_select_policy ON public.business_calendar_exceptions;
CREATE POLICY calendar_exceptions_select_policy ON public.business_calendar_exceptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_calendar bc
      WHERE bc.id = calendar_id
        AND bc.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(bc.branch_id))
    )
  );

DROP POLICY IF EXISTS calendar_exceptions_manage_policy ON public.business_calendar_exceptions;
CREATE POLICY calendar_exceptions_manage_policy ON public.business_calendar_exceptions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.business_calendar bc
      WHERE bc.id = calendar_id
        AND bc.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR (public.auth_user_has_branch_access(bc.branch_id) AND public.auth_has_permission('org:branch:manage')))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_calendar bc
      WHERE bc.id = calendar_id
        AND bc.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR (public.auth_user_has_branch_access(bc.branch_id) AND public.auth_has_permission('org:branch:manage')))
    )
  );

-- Ensure Parent business_calendar also has RLS Policies
DROP POLICY IF EXISTS business_calendar_select_policy ON public.business_calendar;
CREATE POLICY business_calendar_select_policy ON public.business_calendar
  FOR SELECT TO authenticated
  USING (
    business_id = public.auth_current_business_id()
    AND (public.auth_is_owner() OR public.auth_user_has_branch_access(branch_id))
  );

DROP POLICY IF EXISTS business_calendar_manage_policy ON public.business_calendar;
CREATE POLICY business_calendar_manage_policy ON public.business_calendar
  FOR ALL TO authenticated
  USING (
    business_id = public.auth_current_business_id()
    AND (public.auth_is_owner() OR (public.auth_user_has_branch_access(branch_id) AND public.auth_has_permission('org:branch:manage')))
  )
  WITH CHECK (
    business_id = public.auth_current_business_id()
    AND (public.auth_is_owner() OR (public.auth_user_has_branch_access(branch_id) AND public.auth_has_permission('org:branch:manage')))
  );

-- ============================================================================
-- 2. HARDEN SERVICE ORDER & JOB CHILD TABLES RLS
-- ============================================================================

-- service_order_items
DROP POLICY IF EXISTS so_items_select_policy ON public.service_order_items;
CREATE POLICY so_items_select_policy ON public.service_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  );

DROP POLICY IF EXISTS so_items_manage_policy ON public.service_order_items;
CREATE POLICY so_items_manage_policy ON public.service_order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  );

-- service_order_assets
DROP POLICY IF EXISTS so_assets_select_policy ON public.service_order_assets;
CREATE POLICY so_assets_select_policy ON public.service_order_assets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  );

DROP POLICY IF EXISTS so_assets_manage_policy ON public.service_order_assets;
CREATE POLICY so_assets_manage_policy ON public.service_order_assets
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  );

-- service_order_estimates
DROP POLICY IF EXISTS so_estimates_select_policy ON public.service_order_estimates;
CREATE POLICY so_estimates_select_policy ON public.service_order_estimates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  );

DROP POLICY IF EXISTS so_estimates_manage_policy ON public.service_order_estimates;
CREATE POLICY so_estimates_manage_policy ON public.service_order_estimates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_orders so
      WHERE so.id = service_order_id
        AND so.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(so.branch_id))
    )
  );

-- jobs child tables (dependencies, assignments, status_history, material_usage, sla, qc)
DROP POLICY IF EXISTS job_assignments_select_policy ON public.job_assignments;
CREATE POLICY job_assignments_select_policy ON public.job_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND j.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(j.branch_id))
    )
  );

DROP POLICY IF EXISTS job_qc_select_policy ON public.job_qc;
CREATE POLICY job_qc_select_policy ON public.job_qc
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_id
        AND j.business_id = public.auth_current_business_id()
        AND (public.auth_is_owner() OR public.auth_user_has_branch_access(j.branch_id))
    )
  );

-- ============================================================================
-- 3. HARDEN SECURITY DEFINER CORE HELPER FUNCTIONS (SET search_path)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_current_business_id()
RETURNS UUID 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT business_id 
  FROM public.tenant_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_current_membership_id()
RETURNS UUID 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT id 
  FROM public.tenant_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_is_owner()
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_memberships tm
    JOIN public.roles r ON tm.role_id = r.id
    WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND (r.code = 'owner' OR tm.is_tenant_wide = true)
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_has_permission(p_code TEXT)
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_memberships tm
    JOIN public.role_permissions rp ON tm.role_id = rp.role_id
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND p.code = p_code
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_has_branch_access(p_branch_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.tenant_memberships tm
    LEFT JOIN public.membership_branch_scopes mbs ON tm.id = mbs.membership_id
    WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND (tm.is_tenant_wide = true OR mbs.branch_id = p_branch_id)
  );
$$;

-- Harden Attendance Integrity Triggers with search_path
CREATE OR REPLACE FUNCTION public.trg_verify_attendance_record_integrity()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_emp_business UUID;
BEGIN
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_verify_attendance_request_integrity()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_emp_business UUID;
BEGIN
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_verify_overtime_request_integrity()
RETURNS TRIGGER 
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_emp_business UUID;
    v_att_business UUID;
    v_att_employee UUID;
BEGIN
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;

    IF NEW.attendance_record_id IS NOT NULL THEN
        SELECT business_id, employee_id INTO v_att_business, v_att_employee 
        FROM public.attendance_records 
        WHERE id = NEW.attendance_record_id;

        IF v_att_business IS NULL THEN
            RAISE EXCEPTION 'Attendance record not found';
        END IF;

        IF v_att_business <> NEW.business_id THEN
            RAISE EXCEPTION 'Attendance record does not belong to the same business tenant';
        END IF;

        IF v_att_employee <> NEW.employee_id THEN
            RAISE EXCEPTION 'Attendance record does not belong to the same employee';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. HARDEN TRANSACTION RPC (BRANCH SCOPE, PERMISSION & CUSTOMER ISOLATION)
-- ============================================================================

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

    -- Security Guard A: Enforce Branch Access Authorization
    IF NOT (public.auth_is_owner() OR public.auth_user_has_branch_access(p_branch_id)) THEN
        RAISE EXCEPTION 'Unauthorized: User does not have access to execute transactions in branch %', p_branch_id
            USING ERRCODE = '42501';
    END IF;

    -- Security Guard B: Enforce Transaction Create Permission
    IF NOT (public.auth_is_owner() OR public.auth_has_permission('transaction:create')) THEN
        RAISE EXCEPTION 'Unauthorized: User lacks transaction:create permission'
            USING ERRCODE = '42501';
    END IF;

    -- Security Guard C: Enforce Customer Tenant Isolation
    IF p_customer_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.customers 
            WHERE id = p_customer_id AND business_id = v_business_id
        ) THEN
            RAISE EXCEPTION 'Security violation: Customer % does not belong to active tenant %', p_customer_id, v_business_id
                USING ERRCODE = '42501';
        END IF;
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
            id, business_id, branch_id, customer_id, kasir_employee_id,
            subtotal, discount, total_amount, payment_method, status
        ) VALUES (
            v_trx_id, v_business_id, p_branch_id, p_customer_id, v_kasir_id,
            v_subtotal, COALESCE(p_header_discount, 0), v_total_amount, LOWER(p_payment_method), 'COMPLETED'
        );
    ELSE
        INSERT INTO public.transactions (
            business_id, branch_id, customer_id, kasir_employee_id,
            subtotal, discount, total_amount, payment_method, status
        ) VALUES (
            v_business_id, p_branch_id, p_customer_id, v_kasir_id,
            v_subtotal, COALESCE(p_header_discount, 0), v_total_amount, LOWER(p_payment_method), 'COMPLETED'
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

COMMIT;
