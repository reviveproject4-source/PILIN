-- ==============================================================================
-- PILIN ERP — PRE-FLIGHT PREREQUISITES & STRUCTURAL INTEGRITY CHECK
-- 100% READ-ONLY (No DDL, No Writes)
-- Jalankan di Supabase SQL Editor SEBELUM mengeksekusi migrasi apapun.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. RINGKASAN EVALUASI PRASYARAT MIGRASI
-- ------------------------------------------------------------------------------
WITH 
required_columns AS (
    SELECT * FROM (VALUES
        ('tenant_feature_flags', 'tenant_id', 'uuid'),
        ('tenant_feature_flags', 'feature_code', 'text'),
        ('business_calendar_rules', 'calendar_id', 'uuid'),
        ('business_calendar_exceptions', 'calendar_id', 'uuid'),
        ('transactions', 'kasir_employee_id', 'uuid'),
        ('transactions', 'branch_id', 'uuid'),
        ('tenant_memberships', 'business_id', 'uuid'),
        ('tenant_memberships', 'user_id', 'uuid'),
        ('tenant_memberships', 'is_active', 'boolean'),
        ('tenants', 'id', 'uuid'),
        ('branches', 'business_id', 'uuid')
    ) AS t(table_name, column_name, expected_type)
),
column_check AS (
    SELECT 
        rc.table_name,
        rc.column_name,
        rc.expected_type,
        CASE 
            WHEN c.column_name IS NULL THEN 'MISSING'
            WHEN c.data_type ILIKE '%' || rc.expected_type || '%' 
              OR c.udt_name ILIKE '%' || rc.expected_type || '%' THEN 'VALID'
            ELSE 'TYPE MISMATCH (' || c.data_type || ' vs ' || rc.expected_type || ')'
        END AS status
    FROM required_columns rc
    LEFT JOIN information_schema.columns c 
      ON c.table_schema = 'public' 
     AND c.table_name = rc.table_name 
     AND c.column_name = rc.column_name
),
idempotent_tables AS (
    SELECT 
        'pilin_prospect_activities' AS table_name,
        EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE n.nspname = 'public' AND c.relname = 'pilin_prospect_activities'
        ) AS table_exists
    UNION ALL
    SELECT 
        'outbox_events' AS table_name,
        EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
            WHERE n.nspname = 'public' AND c.relname = 'outbox_events'
        ) AS table_exists
),
required_helpers AS (
    SELECT * FROM (VALUES
        ('auth_current_business_id'),
        ('auth_current_membership_id'),
        ('auth_has_permission'),
        ('auth_is_owner'),
        ('auth_user_has_branch_access')
    ) AS h(function_name)
),
helper_check AS (
    SELECT 
        rh.function_name,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace 
                WHERE n.nspname = 'public' AND p.proname = rh.function_name
            ) THEN 'TERSEDIA'
            ELSE 'BELUM ADA'
        END AS status
    FROM required_helpers rh
)
SELECT 
    '1. Validasi Kolom Kunci' AS "Kategori Pemeriksaan",
    count(*) AS "Total Diperiksa",
    count(*) FILTER (WHERE status = 'VALID') AS "Lolos",
    count(*) FILTER (WHERE status != 'VALID') AS "Gagal",
    CASE 
        WHEN count(*) FILTER (WHERE status != 'VALID') = 0 THEN 'PRASYARAT LOLOS (STRUKTUR VALID)'
        ELSE 'GAGAL: ADA KOLOM TIDAK COCOK'
    END AS "Hasil Evaluasi"
FROM column_check

UNION ALL

SELECT 
    '2. Status Tabel Idempotent (73 & 74)' AS "Kategori Pemeriksaan",
    count(*) AS "Total Diperiksa",
    count(*) FILTER (WHERE table_exists) AS "Lolos",
    count(*) FILTER (WHERE NOT table_exists) AS "Gagal",
    CASE 
        WHEN count(*) FILTER (WHERE table_exists) = 2 THEN 'KEDUA TABEL SUDAH ADA DI LIVE'
        WHEN count(*) FILTER (WHERE table_exists) = 1 THEN '1 TABEL AKAN DIBUAT OTOMATIS OLEH DDL'
        ELSE 'KEDUA TABEL AKAN DIBUAT OTOMATIS OLEH DDL'
    END AS "Hasil Evaluasi"
FROM idempotent_tables

UNION ALL

SELECT 
    '3. Status Helper Auth RLS' AS "Kategori Pemeriksaan",
    count(*) AS "Total Diperiksa",
    count(*) FILTER (WHERE status = 'TERSEDIA') AS "Lolos",
    count(*) FILTER (WHERE status != 'TERSEDIA') AS "Gagal",
    CASE 
        WHEN count(*) FILTER (WHERE status != 'TERSEDIA') = 0 THEN 'SELURUH HELPER RLS TERSEDIA'
        ELSE 'PERINGATAN: HELPER BELUM ADA'
    END AS "Hasil Evaluasi"
FROM helper_check;

-- ------------------------------------------------------------------------------
-- 2. RINCIAN VALIDASI KOLOM KUNCI SETIAP TABEL
-- ------------------------------------------------------------------------------
WITH 
required_columns AS (
    SELECT * FROM (VALUES
        ('tenant_feature_flags', 'tenant_id', 'uuid'),
        ('tenant_feature_flags', 'feature_code', 'text'),
        ('business_calendar_rules', 'calendar_id', 'uuid'),
        ('business_calendar_exceptions', 'calendar_id', 'uuid'),
        ('transactions', 'kasir_employee_id', 'uuid'),
        ('transactions', 'branch_id', 'uuid'),
        ('tenant_memberships', 'business_id', 'uuid'),
        ('tenant_memberships', 'user_id', 'uuid'),
        ('tenant_memberships', 'is_active', 'boolean')
    ) AS t(table_name, column_name, expected_type)
)
SELECT 
    rc.table_name AS "Tabel",
    rc.column_name AS "Nama Kolom Kunci",
    rc.expected_type AS "Tipe Diharapkan",
    CASE 
        WHEN c.column_name IS NULL THEN 'MISSING (Kolom Tidak Ditemukan!)'
        WHEN c.data_type ILIKE '%' || rc.expected_type || '%' 
          OR c.udt_name ILIKE '%' || rc.expected_type || '%' THEN 'VALID (Cocok)'
        ELSE 'TYPE MISMATCH (' || c.data_type || ' vs ' || rc.expected_type || ')'
    END AS "Status Validasi"
FROM required_columns rc
LEFT JOIN information_schema.columns c 
  ON c.table_schema = 'public' 
 AND c.table_name = rc.table_name 
 AND c.column_name = rc.column_name
ORDER BY rc.table_name, rc.column_name;

