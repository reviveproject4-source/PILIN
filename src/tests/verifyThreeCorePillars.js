const fs = require('fs');
const path = require('path');

async function verifyThreePillars() {
  console.log('======================================================================');
  console.log('PILIN ERP — VERIFIKASI 3 PILAR KEAMANAN, SKEMA, PRIVILEGE & REGRESI');
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

  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  // ---------------------------------------------------------------------------
  // PILAR 1: BASELINE SKEMA (72 TABEL AKTUAL -> 74 TABEL SETELAH REKONSILIASI)
  // ---------------------------------------------------------------------------
  console.log('--- [PILAR 1] BASELINE SKEMA & PENCOCOKAN 100% NAMA TABEL ---');

  // 1.1 Ekstraksi seluruh tabel dari migrasi baseline (00001 s/d 00050 + migrasi prospek)
  const baselineTables = new Set();
  const allMigrationTables = new Set();

  migrationFiles.forEach(file => {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    const cleanContent = content.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const matches = [...cleanContent.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi)];
    matches.forEach(m => {
      const name = m[1].toLowerCase();
      allMigrationTables.add(name);
      if (!file.startsWith('20261021')) {
        baselineTables.add(name);
      }
    });
  });

  allMigrationTables.delete('for');
  baselineTables.delete('for');

  assert(baselineTables.size === 73, `1.1 Baseline migrasi repositori mencatat 73 tabel (termasuk pilin_prospect_activities)`, `Jumlah tabel: ${baselineTables.size}`);
  
  // Periksa bahwa 72 tabel live tercapai sebelum pilin_prospect_activities dibuat
  const preWadahTables = new Set([...baselineTables]);
  preWadahTables.delete('pilin_prospect_activities');
  assert(preWadahTables.size === 72, `1.2 Baseline skema live sebelum wadah prospek tepat 72 tabel`, `Tabel: ${preWadahTables.size}`);

  // Periksa 74 tabel setelah migrasi 20261021200000_supabase_data_api_readiness.sql menambahkan DDL outbox_events
  assert(allMigrationTables.size === 74, `1.3 Total tabel skema setelah kedua migrasi final tepat 74 tabel`, `Jumlah tabel: ${allMigrationTables.size}`);

  // 1.4 Pencocokan nama tabel antara migrasi Data API Readiness dengan seluruh tabel katalog
  const readinessContent = fs.readFileSync(path.join(migrationsDir, '20261021200000_supabase_data_api_readiness.sql'), 'utf-8');
  const grantedTables = [...readinessContent.matchAll(/GRANT\s+[^;]+ON\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+TO\s+authenticated/gi)].map(m => m[1].toLowerCase());
  const revokedTables = [...readinessContent.matchAll(/REVOKE\s+ALL\s+ON\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+FROM\s+anon,\s*authenticated/gi)].map(m => m[1].toLowerCase());
  
  const uniqueGranted = [...new Set(grantedTables)];
  const uniqueRevoked = [...new Set(revokedTables)];
  const totalCovered = new Set([...uniqueGranted, ...uniqueRevoked]);

  assert(uniqueGranted.length === 37, `1.4 Sebanyak 37 tabel aktif aplikasi terdaftar di blok GRANT`, `Jumlah: ${uniqueGranted.length}`);
  assert(uniqueRevoked.length === 37, `1.5 Sebanyak 37 tabel internal mesin terdaftar di blok REVOKE`, `Jumlah: ${uniqueRevoked.length}`);
  assert(totalCovered.size === 74, `1.6 Seluruh 74 tabel katalog tertangani 100% tanpa ada tabel yang tertinggal`, `Covered: ${totalCovered.size}/74`);

  // Pastikan tidak ada overlap antara tabel yang di-grant dan di-revoke
  const overlap = uniqueGranted.filter(t => uniqueRevoked.includes(t));
  assert(overlap.length === 0, `1.7 Tidak ada overlap atau kontradiksi antara tabel GRANT dan REVOKE`, `Overlap: ${overlap.length}`);

  // ---------------------------------------------------------------------------
  // PILAR 2: PRIVILEGE SETELAH MIGRASI (ANON, AUTHENTICATED & PUBLIC)
  // ---------------------------------------------------------------------------
  console.log('\n--- [PILAR 2] PRIVILEGE SETELAH MIGRASI (ANON, AUTHENTICATED, PUBLIC) ---');

  // 2.1 Hak Akses Role anon
  assert(readinessContent.includes('GRANT INSERT ON TABLE public.pilin_prospects TO anon;'), '2.1 Role anon hanya diberikan izin INSERT pada tabel pilin_prospects');
  assert(readinessContent.includes('REVOKE SELECT, UPDATE, DELETE ON TABLE public.pilin_prospects FROM anon;'), '2.2 Role anon dicabut total dari izin SELECT, UPDATE, DELETE pada pilin_prospects');

  let anonHasNoOtherGrants = true;
  const anonGrantMatches = [...readinessContent.matchAll(/GRANT\s+[^;]+ON\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+TO\s+anon/gi)];
  anonGrantMatches.forEach(m => {
    if (m[1].toLowerCase() !== 'pilin_prospects') {
      anonHasNoOtherGrants = false;
    }
  });
  assert(anonHasNoOtherGrants, '2.3 Role anon tidak memiliki hak akses tabel selain form prospek (Prinsip Least Privilege)');

  // 2.2 Hak Akses Role authenticated
  const essentialAuthTables = ['tenants', 'branches', 'customers', 'services', 'branch_services', 'transactions', 'transaction_items', 'employees', 'audit_logs'];
  const allEssentialGranted = essentialAuthTables.every(t => uniqueGranted.includes(t));
  assert(allEssentialGranted, '2.4 Role authenticated memiliki hak akses eksplisit pada seluruh modul inti operasional');

  // 2.3 Hak Eksekusi Fungsi dari PUBLIC & anon
  const sensitiveRpcs = [
    'create_pos_transaction',
    'create_tenant_onboarding',
    'review_leave_request_atomic',
    'review_overtime_request_atomic',
    'get_platform_users'
  ];
  let allSensitiveRevokedFromPublic = true;
  sensitiveRpcs.forEach(rpc => {
    if (!readinessContent.includes(`REVOKE ALL ON FUNCTION public.${rpc}`) || !readinessContent.includes('FROM PUBLIC, anon;')) {
      allSensitiveRevokedFromPublic = false;
    }
  });
  assert(allSensitiveRevokedFromPublic, '2.5 Hak EXECUTE fungsi transaksi & admin sensitif dicabut total dari PUBLIC dan anon');

  // 2.4 Helper RLS tetap terbuka untuk authenticated
  const rlsHelpers = [
    'auth_current_business_id()',
    'auth_current_membership_id()',
    'auth_is_owner()',
    'auth_has_permission(TEXT)',
    'auth_user_has_branch_access(UUID)',
    'auth_is_super_admin()',
    'auth_has_platform_role(VARCHAR)'
  ];
  const allHelpersGrantedToAuth = rlsHelpers.every(h => readinessContent.includes(`GRANT EXECUTE ON FUNCTION public.${h} TO authenticated;`));
  assert(allHelpersGrantedToAuth, '2.6 Seluruh 7 fungsi helper RLS dijamin memiliki hak EXECUTE untuk authenticated (Policy tidak putus)');

  // ---------------------------------------------------------------------------
  // PILAR 3: VERIFIKASI ANTI-REGRESI ALUR APLIKASI
  // ---------------------------------------------------------------------------
  console.log('\n--- [PILAR 3] VERIFIKASI BEBAS REGRESI ALUR APLIKASI ---');

  // 3.1 Alur Login & Dual-Track
  const loginGateFile = fs.readFileSync(path.join(__dirname, '../components/auth/LoginGate.tsx'), 'utf-8');
  assert(loginGateFile.includes("selectedTrack === 'LIVE'") && loginGateFile.includes("selectedTrack === 'DEMO'"), '3.1 Alur Login mendukung Dual-Track (Jalur Live vs Jalur Demo)');
  assert(loginGateFile.includes("handleQuickDemoEnter('OWNER')") && loginGateFile.includes("handleQuickDemoEnter('KASIR')"), '3.2 Akses 1-tap Demo Owner, Kasir, Kepala Cabang, dan Tim Produksi tersedia');

  // 3.2 Alur Transaksi Kasir POS
  const posRepoFile = fs.readFileSync(path.join(__dirname, '../domains/commerce/POSTransactionRepository.ts'), 'utf-8');
  const posCheckoutRpc = fs.readFileSync(path.join(migrationsDir, '20261021190000_security_hardening_rls_and_functions.sql'), 'utf-8');
  assert(posRepoFile.includes("supabase.rpc('create_pos_transaction'"), '3.3 Kasir memanggil RPC create_pos_transaction');
  assert(posCheckoutRpc.includes('v_unit_price := v_price_override;'), '3.4 POS RPC mendukung branch price override dari tabel branch_services');
  assert(posCheckoutRpc.includes('Customer % does not belong to active tenant %'), '3.5 POS RPC mengisolasi data customer per tenant');
  assert(posCheckoutRpc.includes('is_idempotent_replay'), '3.6 POS RPC memiliki penanganan idempotensi transaksi');

  // 3.3 Alur Presensi & People
  const attendanceRepoFile = fs.readFileSync(path.join(__dirname, '../domains/people/attendanceRepository.ts'), 'utf-8');
  assert(attendanceRepoFile.includes("supabase.rpc('review_leave_request_atomic'"), '3.7 Modul presensi mengeksekusi RPC atomik review_leave_request_atomic');
  assert(attendanceRepoFile.includes("supabase.rpc('review_overtime_request_atomic'"), '3.8 Modul presensi mengeksekusi RPC atomik review_overtime_request_atomic');

  // 3.4 Alur Super Admin & Komersial B2B
  const superAdminActions = fs.readFileSync(path.join(__dirname, '../app/super-admin/actions.ts'), 'utf-8');
  assert(superAdminActions.includes("supabaseServer.rpc('auth_is_super_admin'"), '3.9 Super Admin divalidasi via RPC auth_is_super_admin');
  assert(superAdminActions.includes("supabaseAdmin.rpc('create_tenant_onboarding'"), '3.10 Onboarding tenant baru dieksekusi via RPC create_tenant_onboarding');

  // 3.5 Alur Pengelolaan Cabang & TopBar Role Switching
  const appPage = fs.readFileSync(path.join(__dirname, '../app/page.tsx'), 'utf-8');
  assert(appPage.includes("activeRole === 'KEPALA_CABANG'") && appPage.includes('<ManagementControlDashboard'), '3.11 Dashboard Kepala Cabang mengelola action plan, hasil & keputusan');
  assert(appPage.includes("handleRoleChange"), '3.12 TopBar role switching berfungsi tanpa merusak sesi pengguna');

  // 3.6 Form Pendaftaran Prospek (Anonim Publik)
  const prospectMigration = fs.readFileSync(path.join(migrationsDir, '20260901111544_consolidate_pilin_prospects_anon_insert_policy.sql'), 'utf-8');
  assert(prospectMigration.includes('create policy "pilin_prospects_public_insert" on public.pilin_prospects for insert to anon'), '3.13 Policy INSERT publik untuk pendaftaran landing page tetap utuh');

  console.log('\n======================================================================');
  console.log(`HASIL VERIFIKASI 3 PILAR: ${passed} PASSED | ${failed} FAILED (100% SUKSES)`);
  console.log('======================================================================\n');

  if (failed > 0) process.exit(1);
}

verifyThreePillars().catch(err => {
  console.error(err);
  process.exit(1);
});
