-- Migration: 20261021200000_supabase_data_api_readiness.sql
-- Description: Prioritas 1: Kesiapan Perubahan Supabase Data API (PostgREST Oct 30)
-- 1. Berikan hak akses eksplisit (GRANT) pada 37 tabel aktif yang diakses aplikasi PILIN
-- 2. Kunci tabel internal (REVOKE) dari API anon & authenticated agar tidak terbuka tanpa alasan
-- 3. Batasi hak eksekusi RPC (EXECUTE) pada fungsi sensitif, amankan helper RLS

BEGIN;

-- Production Safety: Set timeouts to avoid blocking live user transactions
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ============================================================================
-- 0. SCHEMA RECONCILIATION & SAFETY DDL (IDEMPOTENT RECONCILIATION)
-- ============================================================================

-- Ensure pilin_prospect_activities exists (reconciles Table #73 safely if prerequisite migration was pending)
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

-- Ensure outbox_events exists (reconciles Table #74)
CREATE TABLE IF NOT EXISTS public.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    actor_id UUID,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(100),
    correlation_id VARCHAR(100),
    causation_id VARCHAR(100),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'outbox_events' 
          AND policyname = 'outbox_events_tenant_policy'
    ) THEN
        CREATE POLICY outbox_events_tenant_policy ON public.outbox_events
            FOR ALL TO authenticated
            USING (business_id = public.auth_current_business_id())
            WITH CHECK (business_id = public.auth_current_business_id());
    END IF;
END $$;

-- ============================================================================
-- 1. TABEL PUBLIK (LOCKDOWN TOTAL PERMISSION ROLE ANON)
-- ============================================================================

-- Cabut seluruh izin pada semua tabel, views, sequence, dan routine dari role anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Kunci default privileges agar tabel baru tidak otomatis memberikan hak akses ke anon
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

-- pilin_prospects: Hanya izinkan INSERT untuk form pendaftaran anonim (dengan RLS check)
GRANT INSERT ON TABLE public.pilin_prospects TO anon;

-- ============================================================================
-- 2. TABEL APLIKASI AKTIF (GRANT EKSPLISIT KEPADA AUTHENTICATED)
-- ============================================================================

-- Modul Core & Organisasi
GRANT SELECT ON TABLE public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.branches TO authenticated;
GRANT SELECT ON TABLE public.tenant_memberships TO authenticated;
GRANT SELECT ON TABLE public.membership_branch_scopes TO authenticated;
GRANT SELECT ON TABLE public.roles TO authenticated;

-- Modul Pelanggan & Katalog (Tenant Master + Branch Overrides)
GRANT SELECT, INSERT, UPDATE ON TABLE public.customers TO authenticated;
GRANT SELECT ON TABLE public.services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_services TO authenticated;

-- Modul Transaksi & Kasir POS
GRANT SELECT, INSERT, UPDATE ON TABLE public.transactions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.transaction_items TO authenticated;
GRANT SELECT, INSERT ON TABLE public.audit_logs TO authenticated;

-- Modul SDM & Presensi (People)
GRANT SELECT, INSERT, UPDATE ON TABLE public.employees TO authenticated;
GRANT SELECT ON TABLE public.divisions TO authenticated;
GRANT SELECT ON TABLE public.positions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.attendance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.overtime_requests TO authenticated;

-- Modul Keuangan & Manajemen Cabang
GRANT SELECT, INSERT, UPDATE ON TABLE public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.action_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.action_results TO authenticated;
GRANT SELECT ON TABLE public.decisions TO authenticated;
GRANT SELECT, INSERT ON TABLE public.outbox_events TO authenticated;

-- Modul Komersial B2B & Super Admin (Terlindungi RLS Super Admin / Sales / Finance)
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_sales_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_demos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_invoice_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_payments TO authenticated;
GRANT SELECT ON TABLE public.platform_product_prices TO authenticated;
GRANT SELECT ON TABLE public.platform_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.platform_provisioning TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_role_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tenant_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pilin_prospects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pilin_prospect_activities TO authenticated;

-- ============================================================================
-- 3. KUNCI TABEL INTERNAL (REVOKE DARI DATA API ANON & AUTHENTICATED)
-- ============================================================================

-- Tabel Konfigurasi & Kalender
REVOKE ALL ON TABLE public.tenant_feature_flags FROM anon, authenticated;
REVOKE ALL ON TABLE public.business_calendar FROM anon, authenticated;
REVOKE ALL ON TABLE public.business_calendar_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.business_calendar_exceptions FROM anon, authenticated;

-- Tabel Staging & Importer
REVOKE ALL ON TABLE public.import_jobs FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_profiles FROM anon, authenticated;
REVOKE ALL ON TABLE public.import_rows FROM anon, authenticated;

-- Tabel Job Execution & SPK Detail Internal (Dimanipulasi via Server Domain / RPC)
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

-- Tabel Internal CRM & Gamifikasi
REVOKE ALL ON TABLE public.branch_performance_metrics FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_proposals FROM anon, authenticated;
REVOKE ALL ON TABLE public.promo_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.reminder_rules FROM anon, authenticated;
REVOKE ALL ON TABLE public.sapaan_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.sapaan_schedules FROM anon, authenticated;
REVOKE ALL ON TABLE public.sapaan_templates FROM anon, authenticated;

-- Tabel Internal Kontrol & Izin Mentah
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

-- ============================================================================
-- 4. BATASI HAK EKSEKUSI RPC (AMANKAN DARI PUBLIC, TETAP BUKA HELPER RLS)
-- ============================================================================

-- Cabut akses eksekusi bebas dari PUBLIC & anon pada seluruh fungsi RPC sensitif
REVOKE ALL ON FUNCTION public.create_pos_transaction(UUID, JSONB, UUID, VARCHAR, NUMERIC, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_tenant_onboarding(VARCHAR, VARCHAR, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_leave_request_atomic(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_platform_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_is_owner() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_has_platform_role(VARCHAR) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_current_business_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_current_membership_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_has_permission(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.auth_user_has_branch_access(UUID) FROM PUBLIC, anon;

-- Helper RLS Functions: Wajib diberikan hak EXECUTE kepada authenticated agar evaluasi kebijakan RLS tidak putus
GRANT EXECUTE ON FUNCTION public.auth_current_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_current_membership_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_has_branch_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_platform_role(VARCHAR) TO authenticated;

-- Workflow & Transaction RPCs: Berikan hak EXECUTE kepada authenticated (dijaga oleh security guard plpgsql)
GRANT EXECUTE ON FUNCTION public.create_pos_transaction(UUID, JSONB, UUID, VARCHAR, NUMERIC, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_onboarding(VARCHAR, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_leave_request_atomic(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_users() TO authenticated;

COMMIT;
