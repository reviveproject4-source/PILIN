-- ==============================================================================
-- PILIN ERP: CEK HASIL IMPLEMENTASI HARDENING (100% READ-ONLY)
-- Jalankan query ini di Supabase SQL Editor untuk melihat status live.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RINGKASAN STATUS KEAMANAN PRODUCTION
-- ------------------------------------------------------------------------------
WITH 
table_rls AS (
    SELECT 
        count(*) AS total_tables,
        count(*) FILTER (WHERE NOT c.relrowsecurity) AS tables_without_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
),
secdef_funcs AS (
    SELECT 
        count(*) FILTER (WHERE p.proconfig IS NULL OR NOT p.proconfig::text ILIKE '%search_path=%') AS secdef_without_search_path
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
    s.secdef_without_search_path AS "SECDEF Tanpa search_path (Target: 0)",
    a.unauthorized_anon_grants AS "Izin Anon Ilegal (Target: 0)",
    auth.active_app_tables_count AS "Tabel Aktif Authenticated (Target: 37)",
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
-- 2. STATUS 3 TABEL TARGET (RLS & KEBIJAKAN)
-- ------------------------------------------------------------------------------
SELECT 
    c.relname AS "Nama Tabel",
    CASE WHEN c.relrowsecurity THEN 'ENABLED (Aman)' ELSE 'DISABLED (Rentan)' END AS "Status RLS",
    count(p.policyname) AS "Jumlah Kebijakan RLS",
    COALESCE(string_agg(p.policyname || ' (' || p.cmd || ')', ', '), 'Belum ada policy') AS "Daftar Kebijakan"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.relname
WHERE n.nspname = 'public' 
  AND c.relname IN ('tenant_feature_flags', 'business_calendar_rules', 'business_calendar_exceptions')
GROUP BY c.relname, c.relrowsecurity
ORDER BY c.relname;

-- ------------------------------------------------------------------------------
-- 3. STATUS SEARCH_PATH FUNGSI SECDEF
-- ------------------------------------------------------------------------------
SELECT 
    p.proname AS "Nama Fungsi",
    CASE 
        WHEN p.proconfig::text ILIKE '%search_path=public, pg_catalog%' THEN 'TERKUNCI AMAN (public, pg_catalog)'
        WHEN p.proconfig IS NOT NULL THEN 'TERKUNCI (' || p.proconfig::text || ')'
        ELSE 'TIDAK DIATUR (RENTAN)'
    END AS "Status search_path"
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' 
  AND p.proname IN (
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
ORDER BY p.proname;

-- ------------------------------------------------------------------------------
-- 4. STATUS IZIN ROLE ANON
-- ------------------------------------------------------------------------------
SELECT 
    table_name AS "Tabel Anon",
    privilege_type AS "Hak Akses",
    CASE 
        WHEN table_name = 'pilin_prospects' AND privilege_type = 'INSERT' THEN 'LEGAL (Form Trial Publik)'
        ELSE 'ILEGAL'
    END AS "Status Kepatuhan"
FROM information_schema.role_table_grants
WHERE table_schema = 'public' 
  AND grantee = 'anon';
