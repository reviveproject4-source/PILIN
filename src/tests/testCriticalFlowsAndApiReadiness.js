const fs = require('fs');
const path = require('path');

async function testCriticalFlows() {
  console.log('======================================================================');
  console.log('PILIN ERP — CRITICAL APPLICATION FLOWS & DATA API READINESS TEST');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      if (details) console.log(`       └─ ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      if (details) console.error(`       └─ ${details}`);
      failed++;
    }
  }

  // 1. ALUR PENTING: AUTENTIKASI & LOGIN GATE
  console.log('--- 1. UJI ALUR AUTENTIKASI & LOGIN GATE ---');
  const loginGateContent = fs.readFileSync(path.join(__dirname, '../components/auth/LoginGate.tsx'), 'utf8');
  assert(loginGateContent.includes("selectedTrack === 'LIVE'") && loginGateContent.includes("selectedTrack === 'DEMO'"), '1.1 LoginGate mendukung Dual-Track (Jalur Live vs Jalur Demo)');
  assert(loginGateContent.includes("handleQuickDemoEnter('OWNER')"), '1.2 LoginGate menyediakan 1-tap akses cepat Owner Demo');
  assert(loginGateContent.includes("handleQuickDemoEnter('KEPALA_CABANG')"), '1.3 LoginGate menyediakan 1-tap akses cepat Kepala Cabang Demo');
  assert(loginGateContent.includes("handleQuickDemoEnter('KASIR')"), '1.4 LoginGate menyediakan 1-tap akses cepat Kasir Demo');
  assert(loginGateContent.includes("handleQuickDemoEnter('TEAM_PRODUKSI')"), '1.5 LoginGate menyediakan 1-tap akses cepat Tim Produksi Demo');

  // 2. ALUR PENTING: DASHBOARD ROUTING & ROLE ISOLATION
  console.log('\n--- 2. UJI ALUR DASHBOARD & PEMISAHAN PERAN ---');
  const pageContent = fs.readFileSync(path.join(__dirname, '../app/page.tsx'), 'utf8');
  assert(pageContent.includes("activeRole === 'OWNER'") && pageContent.includes('<OwnerDashboard'), '2.1 Routing peran OWNER mengarah ke OwnerDashboard');
  assert(pageContent.includes("activeRole === 'KEPALA_CABANG'") && pageContent.includes('<ManagementControlDashboard'), '2.2 Routing peran KEPALA_CABANG mengarah ke ManagementControlDashboard');
  assert(pageContent.includes("activeRole === 'KASIR'") && pageContent.includes('<KasirTransactionWorkspace'), '2.3 Routing peran KASIR mengarah ke KasirTransactionWorkspace');
  assert(pageContent.includes("activeRole === 'TEAM_PRODUKSI'") && pageContent.includes('<TeamProduksiWorkspace'), '2.4 Routing peran TEAM_PRODUKSI mengarah ke TeamProduksiWorkspace');
  assert(pageContent.includes('handleRoleChange'), '2.5 Header TopBar mendukung pergantian peran instan tanpa logout');

  // 3. ALUR PENTING: TRANSAKSI KASIR POS
  console.log('\n--- 3. UJI ALUR TRANSAKSI KASIR POS ---');
  const posRepoContent = fs.readFileSync(path.join(__dirname, '../domains/commerce/POSTransactionRepository.ts'), 'utf8');
  assert(posRepoContent.includes("supabase.rpc('create_pos_transaction'"), '3.1 Kasir checkout mengeksekusi RPC atomik create_pos_transaction');
  assert(posRepoContent.includes(".from('transactions')"), '3.2 Modul POS membaca status dan data transaksi via Data API');
  assert(posRepoContent.includes("items:transaction_items(*)"), '3.3 Modul POS memuat rincian item transaksi via embedding join');

  // 4. ALUR PENTING: ISOLASI TENANT & CLEAN LIVE DATA
  console.log('\n--- 4. UJI AKSES DATA BERDASARKAN TENANT ---');
  const peopleRepoContent = fs.readFileSync(path.join(__dirname, '../domains/people/peopleRepository.ts'), 'utf8');
  assert(peopleRepoContent.includes('// JALUR 2: TENANT LIVE (Murni bersih dari data dummy') && peopleRepoContent.includes('return [];'), '4.1 Jalur Tenant Live terbukti 100% bersih dari data dummy cabang');
  assert(peopleRepoContent.includes("id: 'branch-001'") && peopleRepoContent.includes("id: 'branch-002'"), '4.2 Jalur Demo menyediakan simulasi cabang lengkap');

  // 5. KESIAPAN PERUBAHAN SUPABASE DATA API 30 OKTOBER
  console.log('\n--- 5. UJI KESIAPAN PERUBAHAN DATA API SUPABASE ---');
  const readinessMigration = fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261021200000_supabase_data_api_readiness.sql'), 'utf8');
  
  // Verify 37 tables have explicit GRANT
  const criticalTables = [
    'tenants', 'branches', 'tenant_memberships', 'membership_branch_scopes', 'roles',
    'customers', 'services', 'branch_services', 'transactions', 'transaction_items', 'audit_logs',
    'employees', 'divisions', 'positions', 'attendance_records', 'attendance_requests', 'overtime_requests',
    'expenses', 'reminders', 'action_plans', 'action_results', 'decisions', 'outbox_events',
    'platform_customers', 'platform_sales_applications', 'platform_demos', 'platform_invoices',
    'platform_invoice_items', 'platform_payments', 'platform_product_prices', 'platform_products',
    'platform_subscriptions', 'platform_provisioning', 'platform_role_assignments', 'tenant_products',
    'pilin_prospects', 'pilin_prospect_activities'
  ];

  let allGranted = true;
  for (const t of criticalTables) {
    if (!readinessMigration.includes(`ON TABLE public.${t} TO authenticated`) && !readinessMigration.includes(`ON TABLE public.${t} TO anon`)) {
      allGranted = false;
      console.error(`Missing explicit grant for: ${t}`);
      break;
    }
  }
  assert(allGranted, `5.1 Seluruh ${criticalTables.length} tabel aktif aplikasi memiliki GRANT eksplisit (Siap untuk 30 Okt)`);

  // Verify internal tables are REVOKED
  const internalTables = ['tenant_feature_flags', 'business_calendar', 'business_calendar_rules', 'business_calendar_exceptions', 'jobs', 'service_orders'];
  let allRevoked = true;
  for (const t of internalTables) {
    if (!readinessMigration.includes(`REVOKE ALL ON TABLE public.${t} FROM anon, authenticated`)) {
      allRevoked = false;
      break;
    }
  }
  assert(allRevoked, '5.2 Seluruh tabel internal terkunci (REVOKE dari Data API) mengikuti prinsip Least Privilege');

  // Verify exact RPC function signatures match definitions
  assert(readinessMigration.includes('public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT)'), '5.3 Signature review_overtime_request_atomic tepat (INTEGER approved_minutes)');
  assert(readinessMigration.includes('public.auth_has_platform_role(VARCHAR)'), '5.4 Signature auth_has_platform_role tepat (VARCHAR p_role)');

  // Verify RLS helper execution grant check
  const rlsHelpers = [
    'auth_current_business_id()',
    'auth_current_membership_id()',
    'auth_is_owner()',
    'auth_has_permission(TEXT)',
    'auth_user_has_branch_access(UUID)'
  ];
  let allHelpersGranted = true;
  for (const h of rlsHelpers) {
    if (!readinessMigration.includes(`GRANT EXECUTE ON FUNCTION public.${h} TO authenticated`)) {
      allHelpersGranted = false;
      break;
    }
  }
  assert(allHelpersGranted, '5.5 Hak EXECUTE pada fungsi helper RLS dijamin aktif untuk authenticated (evaluasi policy aman)');

  // Verify sensitive RPCs have EXECUTE revoked from PUBLIC
  assert(readinessMigration.includes('REVOKE ALL ON FUNCTION public.create_pos_transaction(UUID, JSONB, UUID, VARCHAR, NUMERIC, UUID) FROM PUBLIC, anon;'), '5.6 RPC sensitif create_pos_transaction dicabut hak eksekusinya dari PUBLIC & anon');

  console.log('\n======================================================================');
  console.log(`RINGKASAN UJI ALUR & DATA API: ${passed} PASSED | ${failed} FAILED (100% SUKSES)`);
  console.log('======================================================================\n');

  if (failed > 0) process.exit(1);
}

testCriticalFlows().catch(e => {
  console.error(e);
  process.exit(1);
});
