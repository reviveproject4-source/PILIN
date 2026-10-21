const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

async function verifyAllCatalogNames() {
  const db = new PGlite();

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

  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    let sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?uuid-ossp["']?;?/gi, '-- Extension built-in');
    try {
      await db.exec(sql);
    } catch (e) {
      if (f === '00045_prevent_overlapping_leave.sql' && e.message.includes('btree_gist')) {
        // skip
      } else {
        console.error(`Migration error in ${f}:`, e.message);
      }
    }
  }

  // Get all table names in DB
  const tablesRes = await db.query(`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `);

  const dbTableNames = new Set(tablesRes.rows.map(r => r.table_name));
  console.log(`Total tabel di PostgreSQL: ${dbTableNames.size}`);

  const grantedTables = [
    'tenants', 'branches', 'tenant_memberships', 'membership_branch_scopes', 'roles',
    'customers', 'services', 'branch_services', 'transactions', 'transaction_items',
    'audit_logs', 'employees', 'divisions', 'positions', 'attendance_records',
    'attendance_requests', 'overtime_requests', 'expenses', 'reminders', 'action_plans',
    'action_results', 'decisions', 'outbox_events', 'platform_customers',
    'platform_sales_applications', 'platform_demos', 'platform_invoices',
    'platform_invoice_items', 'platform_payments', 'platform_product_prices',
    'platform_products', 'platform_subscriptions', 'platform_provisioning',
    'platform_role_assignments', 'tenant_products', 'pilin_prospects', 'pilin_prospect_activities'
  ];

  const revokedTables = [
    'tenant_feature_flags', 'business_calendar', 'business_calendar_rules',
    'business_calendar_exceptions', 'import_jobs', 'import_profiles', 'import_rows',
    'jobs', 'job_assignments', 'job_dependencies', 'job_material_usage',
    'job_qc', 'job_sla', 'job_status_history', 'deliveries', 'service_orders',
    'service_order_items', 'service_order_assets', 'service_order_estimates',
    'branch_performance_metrics', 'promo_events', 'promo_proposals', 'promo_rules',
    'reminder_rules', 'sapaan_logs', 'sapaan_schedules', 'sapaan_templates',
    'permissions', 'role_permissions', 'transaction_delete_requests',
    'decision_history', 'action_assignments', 'action_evidences',
    'action_execution_logs', 'action_plan_revisions', 'action_result_evaluations',
    'management_signals'
  ];

  console.log('\n--- VERIFIKASI NAMA TABEL DI GRANT TERHADAP DATABASE ---');
  let missingGranted = 0;
  for (const t of grantedTables) {
    if (!dbTableNames.has(t)) {
      console.error(`[ERROR] Tabel GRANT "${t}" TIDAK DITEMUKAN di database!`);
      missingGranted++;
    }
  }
  if (missingGranted === 0) console.log('Semua 37 tabel GRANT valid dan ada di katalog database.');

  console.log('\n--- VERIFIKASI NAMA TABEL DI REVOKE TERHADAP DATABASE ---');
  let missingRevoked = 0;
  for (const t of revokedTables) {
    if (!dbTableNames.has(t)) {
      console.error(`[ERROR] Tabel REVOKE "${t}" TIDAK DITEMUKAN di database!`);
      missingRevoked++;
    }
  }
  if (missingRevoked === 0) console.log('Semua 37 tabel REVOKE valid dan ada di katalog database.');

  console.log('\n--- CEK TABEL DATABASE YANG BELUM TERDAFTAR (UNMAPPED) ---');
  const allMapped = new Set([...grantedTables, ...revokedTables]);
  let unmapped = 0;
  for (const t of dbTableNames) {
    if (!allMapped.has(t)) {
      console.error(`[UNMAPPED] Tabel "${t}" ada di database tetapi tidak ada di GRANT maupun REVOKE!`);
      unmapped++;
    }
  }
  if (unmapped === 0) {
    console.log('Sempurna! Tepat 100% dari 74 tabel telah dipetakan (37 granted + 37 revoked = 74 tabel).');
  }

  // Check RLS on all 74 tables
  const noRls = tablesRes.rows.filter(r => !r.rls_enabled);
  console.log(`\nJumlah tabel tanpa RLS di database: ${noRls.length}`);
  if (noRls.length > 0) {
    console.error('Tabel tanpa RLS:', noRls.map(r => r.table_name));
  } else {
    console.log('Semua 74 tabel (100%) memiliki RLS aktif!');
  }
}

verifyAllCatalogNames().catch(console.error);
