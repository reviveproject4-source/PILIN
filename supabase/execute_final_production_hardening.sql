-- ==============================================================================
-- PILIN ERP: FINAL PRODUCTION DATABASE HARDENING (LANGKAH A, B, & C)
-- Eksekusi di Supabase SQL Editor untuk mencapai 100% Status AMAN
-- ==============================================================================

-- ==============================================================================
-- LANGKAH A: AKTIFKAN RLS PADA 3 TABEL INTERNAL & PASANG POLICY ISOLASI TENANT
-- ==============================================================================
ALTER TABLE IF EXISTS public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_calendar_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.business_calendar_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_feature_flags_isolation_policy" ON public.tenant_feature_flags;
CREATE POLICY "tenant_feature_flags_isolation_policy" ON public.tenant_feature_flags
    FOR ALL TO authenticated
    USING (tenant_id = public.auth_current_business_id())
    WITH CHECK (tenant_id = public.auth_current_business_id());

DROP POLICY IF EXISTS "business_calendar_rules_isolation_policy" ON public.business_calendar_rules;
CREATE POLICY "business_calendar_rules_isolation_policy" ON public.business_calendar_rules
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.business_calendar bc
        WHERE bc.id = calendar_id AND bc.business_id = public.auth_current_business_id()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.business_calendar bc
        WHERE bc.id = calendar_id AND bc.business_id = public.auth_current_business_id()
    ));

DROP POLICY IF EXISTS "business_calendar_exceptions_isolation_policy" ON public.business_calendar_exceptions;
CREATE POLICY "business_calendar_exceptions_isolation_policy" ON public.business_calendar_exceptions
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.business_calendar bc
        WHERE bc.id = calendar_id AND bc.business_id = public.auth_current_business_id()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.business_calendar bc
        WHERE bc.id = calendar_id AND bc.business_id = public.auth_current_business_id()
    ));

-- ==============================================================================
-- LANGKAH B: KUNCI SEARCH_PATH PADA SELURUH FUNGSI SECURITY DEFINER (9 FUNGSI)
-- Otomatis mendeteksi signature parameter eksisting langsung dari katalog sistem
-- ==============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT oid::regprocedure::text AS sig 
        FROM pg_proc 
        WHERE proname IN (
            'auth_current_business_id',
            'auth_current_membership_id',
            'auth_has_permission',
            'auth_is_owner',
            'auth_user_has_branch_access',
            'trg_verify_attendance_record_integrity',
            'trg_verify_attendance_request_integrity',
            'trg_verify_overtime_request_integrity',
            'create_pos_transaction'
        ) 
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'ALTER FUNCTION ' || r.sig || ' SET search_path = public, pg_catalog;';
    END LOOP;
END $$;

-- ==============================================================================
-- LANGKAH C: REKONSILIASI TABEL #73 & #74 DAN KUNCI 37 TABEL INTERNAL
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.pilin_prospect_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES public.pilin_prospects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pic_name TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    notes TEXT NOT NULL,
    result TEXT
);
ALTER TABLE public.pilin_prospect_activities ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    actor_id UUID,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dispatched_at TIMESTAMPTZ
);
ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

-- Cabut akses 37 tabel internal dari API PostgREST (anon & authenticated)
REVOKE ALL ON TABLE public.tenant_feature_flags FROM anon, authenticated;
REVOKE ALL ON TABLE public.business_calendar FROM anon, authenticated;
REVOKE ALL ON TABLE public.business_calendar_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.business_calendar_exceptions FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_rows FROM anon, authenticated;
REVOKE ALL ON TABLE public.jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_dependencies FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_material_usage FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_qc FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_sla FROM anon, authenticated;
REVOKE ALL ON TABLE public.job_status_history FROM anon, authenticated;
REVOKE ALL ON TABLE public.deliveries FROM anon, authenticated;
REVOKE ALL ON TABLE public.service_orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.service_order_items FROM anon, authenticated;
REVOKE ALL ON TABLE public.service_order_assets FROM anon, authenticated;
REVOKE ALL ON TABLE public.service_order_estimates FROM anon, authenticated;
REVOKE ALL ON TABLE public.branch_performance_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.reminder_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.sapaan_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.sapaan_schedules FROM anon, authenticated;
REVOKE ALL ON TABLE public.sapaan_templates FROM anon, authenticated;
REVOKE ALL ON TABLE public.permissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.role_permissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.transaction_delete_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.decision_history FROM anon, authenticated;
REVOKE ALL ON TABLE public.action_assignments FROM anon, authenticated;
REVOKE ALL ON TABLE public.action_evidences FROM anon, authenticated;
REVOKE ALL ON TABLE public.action_execution_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.action_plan_revisions FROM anon, authenticated;
REVOKE ALL ON TABLE public.action_result_evaluations FROM anon, authenticated;
REVOKE ALL ON TABLE public.management_signals FROM anon, authenticated;
