const { PGlite } = require('@electric-sql/pglite');
const fs = require('fs');
const path = require('path');

async function testCompactUnifiedFix() {
  const db = new PGlite();

  // Setup basic environment
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE SCHEMA IF NOT EXISTS extensions;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
    END $$;
    CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, email VARCHAR(255));
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$ SELECT NULL::uuid; $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT 'anon'; $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb; $$;
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      public BOOLEAN DEFAULT FALSE,
      avif_autodetection BOOLEAN DEFAULT FALSE,
      file_size_limit BIGINT,
      allowed_mime_types TEXT[]
    );
    CREATE TABLE IF NOT EXISTS storage.objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id TEXT,
      name TEXT,
      owner UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
      metadata JSONB
    );
    CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE plpgsql AS $$
    BEGIN RETURN string_to_array(name, '/'); END; $$;
  `);

  // Apply baseline migrations
  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  const allFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const baselineFiles = allFiles.filter(f => !f.startsWith('20261021') && f !== '20260915113000_update_pilin_prospects_wadah.sql');

  for (const f of baselineFiles) {
    let sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?uuid-ossp["']?;?/gi, '-- Extension built-in');
    try {
      await db.exec(sql);
    } catch (e) {
      if (f === '00045_prevent_overlapping_leave.sql' && e.message.includes('btree_gist')) {
        // skip
      }
    }
  }

  // Simulate anon lockdown (already executed by Mami Lina)
  await db.exec(`
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
    GRANT INSERT ON TABLE public.pilin_prospects TO anon;
  `);

  console.log('Testing Compact Hardening Script...');

  const compactSql = `
    BEGIN;

    SET LOCAL statement_timeout = '30s';
    SET LOCAL lock_timeout = '5s';

    -- 1. TABEL IDEMPOTENT (REKONSILIASI 74 TABEL)
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

    -- 2. AKTIFKAN RLS PADA 3 TABEL TARGET & KEBIJAKAN TENANT
    ALTER TABLE IF EXISTS public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;

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

    -- 3. KUNCI SEARCH_PATH PADA SELURUH FUNGSI HELPER & SECDEF SECARA NATIVE
    ALTER FUNCTION public.auth_current_business_id() SET search_path = public, pg_catalog;
    ALTER FUNCTION public.auth_current_membership_id() SET search_path = public, pg_catalog;
    ALTER FUNCTION public.auth_is_owner() SET search_path = public, pg_catalog;
    ALTER FUNCTION public.auth_has_permission(TEXT) SET search_path = public, pg_catalog;
    ALTER FUNCTION public.auth_user_has_branch_access(UUID) SET search_path = public, pg_catalog;
    ALTER FUNCTION public.trg_verify_attendance_record_integrity() SET search_path = public, pg_catalog;
    ALTER FUNCTION public.trg_verify_attendance_request_integrity() SET search_path = public, pg_catalog;
    ALTER FUNCTION public.trg_verify_overtime_request_integrity() SET search_path = public, pg_catalog;
    ALTER FUNCTION public.create_pos_transaction(UUID, JSONB, UUID, VARCHAR, NUMERIC, UUID) SET search_path = public, pg_catalog;

    -- 4. KUNCI 37 TABEL INTERNAL DARI DATA API (REVOKE AUTHENTICATED)
    REVOKE ALL ON TABLE public.tenant_feature_flags FROM authenticated;
    REVOKE ALL ON TABLE public.business_calendar FROM authenticated;
    REVOKE ALL ON TABLE public.business_calendar_rules FROM authenticated;
    REVOKE ALL ON TABLE public.business_calendar_exceptions FROM authenticated;
    REVOKE ALL ON TABLE public.import_jobs FROM authenticated;
    REVOKE ALL ON TABLE public.import_profiles FROM authenticated;
    REVOKE ALL ON TABLE public.import_rows FROM authenticated;
    REVOKE ALL ON TABLE public.jobs FROM authenticated;
    REVOKE ALL ON TABLE public.job_assignments FROM authenticated;
    REVOKE ALL ON TABLE public.job_dependencies FROM authenticated;
    REVOKE ALL ON TABLE public.job_material_usage FROM authenticated;
    REVOKE ALL ON TABLE public.job_qc FROM authenticated;
    REVOKE ALL ON TABLE public.job_sla FROM authenticated;
    REVOKE ALL ON TABLE public.job_status_history FROM authenticated;
    REVOKE ALL ON TABLE public.deliveries FROM authenticated;
    REVOKE ALL ON TABLE public.service_orders FROM authenticated;
    REVOKE ALL ON TABLE public.service_order_items FROM authenticated;
    REVOKE ALL ON TABLE public.service_order_assets FROM authenticated;
    REVOKE ALL ON TABLE public.service_order_estimates FROM authenticated;
    REVOKE ALL ON TABLE public.branch_performance_metrics FROM authenticated;
    REVOKE ALL ON TABLE public.promo_events FROM authenticated;
    REVOKE ALL ON TABLE public.promo_proposals FROM authenticated;
    REVOKE ALL ON TABLE public.promo_rules FROM authenticated;
    REVOKE ALL ON TABLE public.reminder_rules FROM authenticated;
    REVOKE ALL ON TABLE public.sapaan_logs FROM authenticated;
    REVOKE ALL ON TABLE public.sapaan_schedules FROM authenticated;
    REVOKE ALL ON TABLE public.sapaan_templates FROM authenticated;
    REVOKE ALL ON TABLE public.permissions FROM authenticated;
    REVOKE ALL ON TABLE public.role_permissions FROM authenticated;
    REVOKE ALL ON TABLE public.transaction_delete_requests FROM authenticated;
    REVOKE ALL ON TABLE public.decision_history FROM authenticated;
    REVOKE ALL ON TABLE public.action_assignments FROM authenticated;
    REVOKE ALL ON TABLE public.action_evidences FROM authenticated;
    REVOKE ALL ON TABLE public.action_execution_logs FROM authenticated;
    REVOKE ALL ON TABLE public.action_plan_revisions FROM authenticated;
    REVOKE ALL ON TABLE public.action_result_evaluations FROM authenticated;
    REVOKE ALL ON TABLE public.management_signals FROM authenticated;

    -- 5. CABUT EKSEKUSI PUBLIC DARI RPC SENSITIF
    REVOKE ALL ON FUNCTION public.create_pos_transaction(UUID, JSONB, UUID, VARCHAR, NUMERIC, UUID) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.create_tenant_onboarding(VARCHAR, VARCHAR, UUID) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.review_leave_request_atomic(UUID, TEXT, TEXT) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.get_platform_users() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.auth_current_business_id() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.auth_current_membership_id() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.auth_has_permission(TEXT) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.auth_is_owner() FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.auth_user_has_branch_access(UUID) FROM PUBLIC;

    GRANT EXECUTE ON FUNCTION public.auth_current_business_id() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.auth_current_membership_id() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.auth_is_owner() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.auth_has_permission(TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.auth_user_has_branch_access(UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_pos_transaction(UUID, JSONB, UUID, VARCHAR, NUMERIC, UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.create_tenant_onboarding(VARCHAR, VARCHAR, UUID) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.review_leave_request_atomic(UUID, TEXT, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT) TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_platform_users() TO authenticated;

    COMMIT;
  `;

  await db.exec(compactSql);
  console.log('Compact Hardening Script executed successfully.');

  // Run Executive Health Verification Query
  const qReport = `
    WITH 
    table_rls AS (
        SELECT count(*) AS total_tables, count(*) FILTER (WHERE NOT c.relrowsecurity) AS tables_without_rls
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
    ),
    secdef_funcs AS (
        SELECT count(*) FILTER (WHERE p.proconfig IS NULL OR NOT p.proconfig::text ILIKE '%search_path=%') AS secdef_without_search_path
        FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef = true
    ),
    anon_privs AS (
        SELECT count(*) AS unauthorized_anon_grants
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'anon' AND NOT (table_name = 'pilin_prospects' AND privilege_type = 'INSERT')
    ),
    auth_active_tables AS (
        SELECT count(DISTINCT table_name) AS active_app_tables_count
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
    )
    SELECT 
        t.total_tables AS "Total Tabel Skema",
        t.tables_without_rls AS "Tabel Tanpa RLS (Target: 0)",
        s.secdef_without_search_path AS "SECDEF Tanpa search_path (Target: 0)",
        a.unauthorized_anon_grants AS "Izin Anon Ilegal (Target: 0)",
        auth.active_app_tables_count AS "Tabel Aktif Authenticated (Target: 37)",
        CASE 
            WHEN t.tables_without_rls = 0 AND s.secdef_without_search_path = 0 AND a.unauthorized_anon_grants = 0 
            THEN 'PASSED: 100% PRODUCTION HARDENED & AMAN'
            ELSE 'WARNING: PRODUCTION MEMERLUKAN HARDENING'
        END AS "Status Keamanan Production"
    FROM table_rls t CROSS JOIN secdef_funcs s CROSS JOIN anon_privs a CROSS JOIN auth_active_tables auth;
  `;

  const finalRes = await db.query(qReport);
  console.log('\nFinal Verification Output:');
  console.table(finalRes.rows);
}

testCompactUnifiedFix().catch(console.error);
