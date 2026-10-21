const fs = require('fs');
const path = require('path');

async function runNonProductionAuditScenarios() {
  console.log('======================================================================');
  console.log('PILIN ERP — NON-PRODUCTION AUDIT & SECURITY SCENARIO TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  function assert(cond, name, details = '') {
    if (cond) {
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       └─ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       └─ ${details}`);
      failed++;
    }
  }

  function warn(name, details = '') {
    console.warn(`[WARN] ${name}`);
    if (details) console.warn(`       └─ ${details}`);
    warnings++;
  }

  const secMigration = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261021190000_security_hardening_rls_and_functions.sql'), 'utf-8');
  const apiMigration = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261021200000_supabase_data_api_readiness.sql'), 'utf-8');

  // SCENARIO 1: TENANT ISOLATION & MULTI-MEMBERSHIP AUDIT
  console.log('--- 1. SCENARIO: TENANT ISOLATION & MULTI-MEMBERSHIP CHECK ---');
  assert(secMigration.includes('CREATE OR REPLACE FUNCTION public.auth_current_business_id()'), '1.1 auth_current_business_id() terdefinisi dengan search_path');
  const hasLimit1 = secMigration.includes('LIMIT 1;');
  const hasOrderBy = /ORDER\s+BY/i.test(secMigration.substring(secMigration.indexOf('auth_current_business_id'), secMigration.indexOf('$$;', secMigration.indexOf('auth_current_business_id'))));
  if (hasLimit1 && !hasOrderBy) {
    warn('1.2 auth_current_business_id() menggunakan LIMIT 1 tanpa ORDER BY', 
      'RISIKO: Jika 1 user_id memiliki >1 tenant_memberships aktif, PostgreSQL memilih baris secara non-deterministik!');
  } else {
    assert(true, '1.2 auth_current_business_id() memiliki mekanisme pemilihan tenant');
  }

  // SCENARIO 2: RLS ON THE 3 PREVIOUSLY UNPROTECTED TABLES
  console.log('\n--- 2. SCENARIO: RLS PADA 3 TABEL TARGET & POLICY EXISTENCE ---');
  assert(secMigration.includes('ALTER TABLE IF EXISTS public.tenant_feature_flags ENABLE ROW LEVEL SECURITY;'), '2.1 tenant_feature_flags ENABLE ROW LEVEL SECURITY');
  assert(secMigration.includes('ALTER TABLE IF EXISTS public.business_calendar_rules ENABLE ROW LEVEL SECURITY;'), '2.2 business_calendar_rules ENABLE ROW LEVEL SECURITY');
  assert(secMigration.includes('ALTER TABLE IF EXISTS public.business_calendar_exceptions ENABLE ROW LEVEL SECURITY;'), '2.3 business_calendar_exceptions ENABLE ROW LEVEL SECURITY');
  assert(secMigration.includes('CREATE POLICY calendar_rules_select_policy'), '2.4 business_calendar_rules memiliki policy SELECT berbasis business_calendar');
  assert(secMigration.includes('CREATE POLICY calendar_exceptions_select_policy'), '2.5 business_calendar_exceptions memiliki policy SELECT berbasis business_calendar');

  // SCENARIO 3: ARCHITECTURAL CONFLICT AUDIT (RLS vs REVOKE ALL)
  console.log('\n--- 3. SCENARIO: AUDIT POTENSI KONFLIK RLS vs REVOKE ALL ---');
  const rlsTablesWithRevoke = [
    'tenant_feature_flags', 'business_calendar', 'business_calendar_rules',
    'business_calendar_exceptions', 'service_orders', 'service_order_items',
    'service_order_assets', 'service_order_estimates', 'jobs', 'job_qc'
  ];

  rlsTablesWithRevoke.forEach(t => {
    const hasRlsPolicy = secMigration.includes(`ON public.${t}`) || secMigration.includes(`ON ${t}`);
    const isRevoked = apiMigration.includes(`REVOKE ALL ON TABLE public.${t} FROM anon, authenticated`);
    if (hasRlsPolicy && isRevoked) {
      warn(`3.x Tabel "${t}" memiliki RLS Policy untuk authenticated TETAPI dicabut via REVOKE ALL`,
        `KONSEKUENSI: Query browser client via PostgREST akan ditolak pada level tabel (HTTP 403 / 42501). RLS tidak akan pernah dievaluasi kecuali hak SELECT dibuka atau diakses via RPC/service_role.`);
    }
  });

  // SCENARIO 4: ANON ACCESS & PUBLIC FORM PROTECTION
  console.log('\n--- 4. SCENARIO: AUDIT AKSES PUBLIK / ANONIM ---');
  assert(apiMigration.includes('GRANT INSERT ON TABLE public.pilin_prospects TO anon;'), '4.1 pilin_prospects hanya mengizinkan INSERT ke anon');
  assert(apiMigration.includes('REVOKE SELECT, UPDATE, DELETE ON TABLE public.pilin_prospects FROM anon;'), '4.2 pilin_prospects mencabut SELECT/UPDATE/DELETE dari anon (mencegah scraping prospek)');

  // SCENARIO 5: CROSS-TENANT & CROSS-BRANCH VALIDATION IN POS RPC
  console.log('\n--- 5. SCENARIO: ATOMIC POS CHECKOUT RPC DEFENSE IN DEPTH ---');
  assert(secMigration.includes('auth_user_has_branch_access(p_branch_id)'), '5.1 POS RPC memblokir kasir yang tidak ditugaskan ke cabang bersangkutan');
  assert(secMigration.includes("auth_has_permission('transaction:create')"), '5.2 POS RPC memverifikasi permission "transaction:create"');
  assert(secMigration.includes('Customer % does not belong to active tenant %'), '5.3 POS RPC memblokir pencurian customer_id lintas tenant');
  assert(secMigration.includes('v_unit_price := v_price_override;'), '5.4 POS RPC mendukung harga khusus cabang via branch_services');
  assert(secMigration.includes('is_idempotent_replay'), '5.5 POS RPC memiliki perlindungan idempotensi p_client_trx_id');

  // SCENARIO 6: TABLE RECONCILIATION LIVE 72 vs MIGRATIONS 74
  console.log('\n--- 6. SCENARIO: REKONSILIASI JUMLAH TABEL ---');
  assert(apiMigration.includes('CREATE TABLE IF NOT EXISTS public.outbox_events'), '6.1 DDL idempotensi outbox_events ada di migrasi readiness');
  assert(apiMigration.includes('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.branch_services TO authenticated;'), '6.2 branch_services resmi terdaftar di tabel aktif');

  console.log('\n======================================================================');
  console.log(`AUDIT SCENARIO SUMMARY: ${passed} PASSED | ${failed} FAILED | ${warnings} WARNINGS IDENTIFIED`);
  console.log('======================================================================\n');
}

runNonProductionAuditScenarios().catch(e => {
  console.error(e);
  process.exit(1);
});
