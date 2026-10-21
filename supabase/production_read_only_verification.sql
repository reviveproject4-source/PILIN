-- ==============================================================================
-- PILIN ERP — PRODUCTION READ-ONLY VERIFICATION SUITE
-- Safe for execution on Production: 100% READ-ONLY (No DDL, No Writes, No Side-Effects)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RINGKASAN KESEHATAN SISTEM PRODUKSI (DIAGNOSTIC EXECUTIVE SUMMARY)
-- ------------------------------------------------------------------------------
WITH 
table_rls AS (
    SELECT 
        count(*) AS total_tables,
        count(*) FILTER (WHERE NOT c.relrowsecurity) AS tables_without_rls,
        count(*) FILTER (WHERE c.relrowsecurity) AS tables_with_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
),
secdef_funcs AS (
    SELECT 
        count(*) AS total_secdef,
        count(*) FILTER (WHERE p.proconfig IS NULL OR NOT p.proconfig::text ILIKE '%search_path=%') AS secdef_without_search_path,
        count(*) FILTER (WHERE p.proconfig::text ILIKE '%search_path=public, pg_catalog%') AS secdef_locked
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
),
anon_privs AS (
    SELECT 
        count(*) AS unauthorized_anon_grants
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
      AND grantee = 'anon'
      AND NOT (table_name = 'pilin_prospects' AND privilege_type = 'INSERT')
),
auth_active_tables AS (
    SELECT 
        count(DISTINCT table_name) AS active_app_tables_count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
      AND grantee = 'authenticated'
)
SELECT 
    t.total_tables AS "Total Tabel Skema",
    t.tables_without_rls AS "Tabel Tanpa RLS (Target: 0)",
    s.total_secdef AS "Total Fungsi SECDEF",
    s.secdef_without_search_path AS "SECDEF Tanpa search_path (Target: 0)",
    a.unauthorized_anon_grants AS "Izin Anon Ilegal (Target: 0)",
    auth.active_app_tables_count AS "Tabel Aktif Authenticated",
    CASE 
        WHEN t.tables_without_rls = 0 
         AND s.secdef_without_search_path = 0 
         AND a.unauthorized_anon_grants = 0 
        THEN 'PASSED: 100% PRODUCTION HARDENED & AMAN'
        ELSE 'WARNING: PRODUCTION MEMERLUKAN HARDENING'
    END AS "Status Keamanan Production"
FROM table_rls t
CROSS JOIN secdef_funcs s
CROSS JOIN anon_privs a
CROSS JOIN auth_active_tables auth;

-- ------------------------------------------------------------------------------
-- 2. VERIFIKASI KHUSUS 3 TABEL TARGET (tenant_feature_flags & kalender)
-- ------------------------------------------------------------------------------
SELECT 
    c.relname AS "Nama Tabel",
    CASE WHEN c.relrowsecurity THEN 'ENABLED (Aman)' ELSE 'DISABLED (Rentan)' END AS "Status RLS",
    count(p.policyname) AS "Jumlah Kebijakan RLS Aktif",
    COALESCE(string_agg(p.policyname || ' (' || p.cmd || ')', ', '), 'Belum ada policy') AS "Daftar Kebijakan"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public' 
  AND c.relname IN ('tenant_feature_flags', 'business_calendar_rules', 'business_calendar_exceptions')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- ------------------------------------------------------------------------------
-- 3. VERIFIKASI 8 FUNGSI SECURITY DEFINER + RPC TRANSAKSI (search_path)
-- ------------------------------------------------------------------------------
SELECT 
    p.proname AS "Nama Fungsi",
    pg_get_function_identity_arguments(p.oid) AS "Argumen / Signature",
    CASE 
        WHEN p.proconfig::text ILIKE '%search_path=public, pg_catalog%' THEN 'TERKUNCI AMAN (public, pg_catalog)'
        WHEN p.proconfig IS NOT NULL THEN 'TERKUNCI (' || p.proconfig::text || ')'
        ELSE 'TIDAK DIATUR (RENTAN HIJACKING)'
    END AS "Status search_path"
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND (
    p.proname IN (
      'auth_current_business_id',
      'auth_current_membership_id',
      'auth_has_permission',
      'auth_is_owner',
      'auth_user_has_branch_access',
      'trg_verify_attendance_record_integrity',
      'trg_verify_attendance_request_integrity',
      'trg_verify_overtime_request_integrity',
      'create_pos_transaction',
      'create_tenant_onboarding',
      'get_platform_users'
    )
  )
ORDER BY p.proname;

-- ------------------------------------------------------------------------------
-- 4. VERIFIKASI PERMISSION ROLE anon (DATA LEAKAGE PREVENTION CHECK)
-- ------------------------------------------------------------------------------
SELECT 
    table_name AS "Tabel yang Dapat Diakses Anon",
    privilege_type AS "Jenis Hak Akses",
    CASE 
        WHEN table_name = 'pilin_prospects' AND privilege_type = 'INSERT' THEN 'LEGAL (Form Trial Landing Page)'
        ELSE 'ILEGAL (Potensi Kebocoran Data!)'
    END AS "Audit Kepatuhan"
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND grantee = 'anon'
ORDER BY table_name, privilege_type;

-- ------------------------------------------------------------------------------
-- 5. VERIFIKASI PENCABUTAN HAK EKSEKUSI DARI PUBLIC PADA RPC SENSITIF
-- ------------------------------------------------------------------------------
SELECT 
    routine_name AS "Nama RPC Sensitif",
    grantee AS "Penerima Izin Eksekusi",
    privilege_type AS "Izin",
    CASE 
        WHEN grantee IN ('PUBLIC', 'anon') THEN 'RENTAN (Terbuka Bebas!)'
        WHEN grantee = 'authenticated' THEN 'TERKONTROL (Hanya User Login)'
        ELSE 'INTERNAL'
    END AS "Tingkat Risiko"
FROM information_schema.routine_privileges
WHERE specific_schema = 'public'
  AND routine_name IN (
    'create_pos_transaction',
    'create_tenant_onboarding',
    'review_leave_request_atomic',
    'review_overtime_request_atomic',
    'get_platform_users'
  )
ORDER BY routine_name, grantee;
