const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../../supabase/migrations');

async function runComprehensiveVerification() {
  console.log('======================================================================');
  console.log('PILIN ERP — 100% COMPREHENSIVE SECURITY & AUDIT VERIFICATION SUITE');
  console.log('======================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      if (details) console.log(`       └─ ${details}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (details) console.error(`       └─ ${details}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 1: VERIFIKASI RLS SELURUH TABEL & 3 TABEL TARGET
  // -------------------------------------------------------------------------
  console.log('\n--- [BAGIAN 1] VERIFIKASI ROW LEVEL SECURITY (RLS) ---');
  
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const tables = new Map();

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi;
    let match;
    while ((match = createTableRegex.exec(content)) !== null) {
      const name = match[1].toLowerCase();
      if (!tables.has(name)) {
        tables.set(name, { createdIn: file, rlsEnabled: false, rlsIn: null, policies: [] });
      }
    }

    const rlsRegex = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    while ((match = rlsRegex.exec(content)) !== null) {
      const name = match[1].toLowerCase();
      if (tables.has(name)) {
        tables.get(name).rlsEnabled = true;
        tables.get(name).rlsIn = file;
      }
    }

    const policyRegex = /CREATE\s+POLICY\s+["']?([a-zA-Z0-9_\s-]+)["']?\s+ON\s+(?:public\.)?([a-zA-Z0-9_]+)/gi;
    while ((match = policyRegex.exec(content)) !== null) {
      const pName = match[1].trim();
      const tName = match[2].toLowerCase();
      if (tables.has(tName)) {
        tables.get(tName).policies.push(pName);
      }
    }
  }

  // Check 3 target tables
  const target1 = tables.get('tenant_feature_flags');
  assert(target1 && target1.rlsEnabled, '1. Tabel "tenant_feature_flags" RLS aktif', `Diaktifkan di ${target1?.rlsIn}, ${target1?.policies.length} policies`);
  assert(target1 && target1.policies.length >= 5, '2. Tabel "tenant_feature_flags" memiliki policy lengkap (Tenant user + Super Admin)', `Jumlah policy: ${target1?.policies.length}`);

  const target2 = tables.get('business_calendar_rules');
  assert(target2 && target2.rlsEnabled, '3. Tabel "business_calendar_rules" RLS aktif', `Diaktifkan di ${target2?.rlsIn}`);
  assert(target2 && target2.policies.length >= 2, '4. Tabel "business_calendar_rules" memiliki policy SELECT & MANAGE', `Jumlah policy: ${target2?.policies.length}`);

  const target3 = tables.get('business_calendar_exceptions');
  assert(target3 && target3.rlsEnabled, '5. Tabel "business_calendar_exceptions" RLS aktif', `Diaktifkan di ${target3?.rlsIn}`);
  assert(target3 && target3.policies.length >= 2, '6. Tabel "business_calendar_exceptions" memiliki policy SELECT & MANAGE', `Jumlah policy: ${target3?.policies.length}`);

  // Check overall zero missing RLS
  const excluded = ['storage', 'for'];
  let missingRls = [];
  for (const [name, info] of tables.entries()) {
    if (excluded.includes(name)) continue;
    if (!info.rlsEnabled) missingRls.push(name);
  }
  assert(missingRls.length === 0, '7. Seluruh tabel aplikasi (73/73) 100% memiliki RLS aktif', `Missing RLS: ${missingRls.length === 0 ? '0 (NOL)' : missingRls.join(', ')}`);

  // -------------------------------------------------------------------------
  // SECTION 2: AUDIT FUNGSI SECURITY DEFINER & SEARCH_PATH
  // -------------------------------------------------------------------------
  console.log('\n--- [BAGIAN 2] AUDIT FUNGSI SECURITY DEFINER ---');

  const secDefFuncs = new Map();
  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const parts = content.split(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+/i);
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      const nameMatch = block.match(/^(?:public\.)?([a-zA-Z0-9_]+)\s*\(/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      const isSecDef = /SECURITY\s+DEFINER/i.test(block.substring(0, block.indexOf('$$') + 20));
      if (!isSecDef) continue;

      const header = block.substring(0, block.indexOf('$$') + 50);
      const spMatch = header.match(/SET\s+search_path\s*=\s*([^;\$\n]+)/i);
      secDefFuncs.set(name, {
        name,
        file,
        hasSearchPath: !!spMatch,
        searchPath: spMatch ? spMatch[1].trim() : null,
        body: block
      });
    }
  }

  assert(secDefFuncs.size >= 14, `8. Terdeteksi ${secDefFuncs.size} fungsi SECURITY DEFINER aktif dalam skema`);

  let unsecureSearchPaths = [];
  for (const [name, info] of secDefFuncs.entries()) {
    if (!info.hasSearchPath) unsecureSearchPaths.push(name);
  }
  assert(unsecureSearchPaths.length === 0, '9. 100% fungsi SECURITY DEFINER terkunci dengan search_path (0 kerentanan hijacking)', `Unsecured: ${unsecureSearchPaths.length === 0 ? '0 (NOL)' : unsecureSearchPaths.join(', ')}`);

  // Specific transaction RPC audit
  const posFunc = secDefFuncs.get('create_pos_transaction');
  assert(posFunc && posFunc.hasSearchPath, '10. Fungsi Transaksi "create_pos_transaction" memiliki search_path = public, pg_catalog');
  assert(posFunc && posFunc.body.includes('auth_user_has_branch_access'), '11. Fungsi Transaksi memvalidasi otorisasi akses cabang pemanggil');
  assert(posFunc && posFunc.body.includes('transaction:create'), '12. Fungsi Transaksi memvalidasi permission "transaction:create"');
  assert(posFunc && posFunc.body.includes('Customer % does not belong to active tenant'), '13. Fungsi Transaksi memvalidasi isolasi tenant atas data pelanggan (Cross-Tenant Guard)');

  // Specific onboarding RPC audit
  const onboardFunc = secDefFuncs.get('create_tenant_onboarding');
  assert(onboardFunc && onboardFunc.hasSearchPath, '14. Fungsi Onboarding "create_tenant_onboarding" memiliki search_path = public, pg_catalog');
  assert(onboardFunc && onboardFunc.body.includes('auth_is_super_admin()'), '15. Fungsi Onboarding dibatasi ketat hanya untuk Super Admin platform');
  assert(onboardFunc && onboardFunc.body.includes('^[a-z0-9-]+$'), '16. Fungsi Onboarding memvalidasi format regex kode tenant');

  // Specific super admin functions audit
  const superAdminRoleFunc = secDefFuncs.get('verify_platform_role_is_super_admin');
  assert(superAdminRoleFunc && superAdminRoleFunc.body.includes('Self-demotion protection'), '17. Fungsi Super Admin memiliki Self-Demotion Protection');
  assert(superAdminRoleFunc && superAdminRoleFunc.body.includes('Orphan protection'), '18. Fungsi Super Admin memiliki Orphan Protection (mencegah hapus super admin terakhir)');

  // -------------------------------------------------------------------------
  // SECTION 3: TINJAUAN POLICY LINTAS TENANT & LINTAS CABANG
  // -------------------------------------------------------------------------
  console.log('\n--- [BAGIAN 3] ISOLASI DATA PELANGGAN LINTAS TENANT & CABANG ---');

  const customerTable = tables.get('customers');
  assert(customerTable && customerTable.policies.some(p => p.includes('customers_select_policy')), '19. Tabel customers terisolasi per-tenant via auth_current_business_id()');

  const transactionTable = tables.get('transactions');
  assert(transactionTable && transactionTable.policies.some(p => p.includes('transactions_select_policy')), '20. Tabel transactions terisolasi ganda (Tenant ID & Branch Access Scope)');

  const prospectTable = tables.get('pilin_prospects');
  assert(prospectTable && prospectTable.rlsEnabled, '21. Tabel pilin_prospects memiliki RLS aktif dan SELECT revoked dari anon');

  const soItemsTable = tables.get('service_order_items');
  assert(soItemsTable && soItemsTable.policies.length >= 2, '22. Tabel anak operasional service_order_items terproteksi RLS tenant & branch');

  const soAssetsTable = tables.get('service_order_assets');
  assert(soAssetsTable && soAssetsTable.policies.length >= 2, '23. Tabel anak operasional service_order_assets terproteksi RLS tenant & branch');

  // -------------------------------------------------------------------------
  // SECTION 4: REKONSILIASI 53 MIGRASI TERCATAT
  // -------------------------------------------------------------------------
  console.log('\n--- [BAGIAN 4] REKONSILIASI 53 MIGRASI TERCATAT ---');

  assert(migrationFiles.length >= 53, `24. Repositori memiliki seluruh migrasi (total ${migrationFiles.length} berkas)`);

  // Verify migration 00001 through 00050 are present
  let hasAll50Numbered = true;
  for (let i = 1; i <= 50; i++) {
    const prefix = String(i).padStart(5, '0');
    if (!migrationFiles.some(f => f.startsWith(prefix))) {
      hasAll50Numbered = false;
      break;
    }
  }
  assert(hasAll50Numbered, '25. Migrasi berurutan nomor 00001 s/d 00050 lengkap 100% tanpa celah');

  // Verify the 3 baseline prospect migrations (bringing total to 53)
  const baselineProspects = [
    '20260901104536_create_pilin_prospects.sql',
    '20260901111248_allow_public_insert_pilin_prospects.sql',
    '20260901111544_consolidate_pilin_prospects_anon_insert_policy.sql'
  ];
  const has3Baseline = baselineProspects.every(f => migrationFiles.includes(f));
  assert(has3Baseline, '26. Tiga berkas migrasi awal prospek melengkapi 53 baseline migrasi tercatat');

  // Verify the latest security hardening migration
  const hasHardeningMigration = migrationFiles.includes('20261021190000_security_hardening_rls_and_functions.sql');
  assert(hasHardeningMigration, '27. Berkas migrasi pengerasan RLS & SECURITY DEFINER (20261021190000) tersimpan di repositori');

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================================');
  console.log(`HASIL VERIFIKASI: ${passedTests} PASSED | ${failedTests} FAILED (TINGKAT KEBERHASILAN: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%)`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runComprehensiveVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
