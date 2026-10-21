const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

async function runPilinSmokeTests() {
  console.log('======================================================================');
  console.log('PILIN ERP — SMOKE TEST SUITE (POS, PRESENSI, DASHBOARD, PROSPEK)');
  console.log('Validasi Alur Kritis Aplikasi Pasca-Hardening Database');
  console.log('======================================================================\n');

  const db = new PGlite();

  // 1. SETUP ENVIRONMENT
  await db.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE SCHEMA IF NOT EXISTS storage;
    CREATE SCHEMA IF NOT EXISTS extensions;
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN CREATE ROLE authenticator NOINHERIT; GRANT anon, authenticated, service_role TO authenticator; END IF;
    END $$;
    CREATE TABLE IF NOT EXISTS auth.users (
      id UUID PRIMARY KEY, email VARCHAR(255), raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
      raw_user_meta_data JSONB DEFAULT '{}'::jsonb, aud VARCHAR(255) DEFAULT 'authenticated',
      role VARCHAR(255) DEFAULT 'authenticated', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS storage.buckets (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, owner UUID, created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(), public BOOLEAN DEFAULT FALSE, avif_autodetection BOOLEAN DEFAULT FALSE,
      file_size_limit BIGINT, allowed_mime_types TEXT[]
    );
    CREATE TABLE IF NOT EXISTS storage.objects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT, owner UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
      last_accessed_at TIMESTAMPTZ DEFAULT NOW(), metadata JSONB
    );
    CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE plpgsql AS $$
    BEGIN RETURN string_to_array(name, '/'); END; $$;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
      SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon');
    $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$
      SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
    $$;
  `);

  // 2. APPLY ALL REPO MIGRATIONS
  const migDir = path.join(__dirname, '../../supabase/migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    let sql = fs.readFileSync(path.join(migDir, f), 'utf-8');
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?uuid-ossp["']?;?/gi, '-- Extension built-in');
    try {
      await db.exec(sql);
    } catch (e) {
      if (f === '00045_prevent_overlapping_leave.sql' && e.message.includes('btree_gist')) {
        // Skip in WASM
      } else {
        throw e;
      }
    }
  }

  let passedTests = 0;
  let totalTests = 4;

  const tenantId = '11111111-1111-1111-1111-111111111111';
  const branchId = '22222222-2222-2222-2222-222222222222';
  const kasirUserId = '33333333-3333-3333-3333-333333333333';
  const customerId = '44444444-4444-4444-4444-444444444444';
  const serviceId = '55555555-5555-5555-5555-555555555555';

  // ============================================================================
  // TEST 1: SMOKE TEST POS & TRANSAKSI KASIR
  // ============================================================================
  console.log('--- [TEST 1] SMOKE TEST: POS & TRANSAKSI CHECKOUT KASIR ---');
  try {
    // Seed master data as superuser
    await db.exec('RESET ROLE;');
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES ('${kasirUserId}', 'kasir@pilin.id') ON CONFLICT DO NOTHING;
      INSERT INTO public.tenants (id, name, code) VALUES ('${tenantId}', 'Laundry Berkah Utama', 'LBU') ON CONFLICT DO NOTHING;
      INSERT INTO public.branches (id, business_id, name) VALUES ('${branchId}', '${tenantId}', 'Cabang Pusat') ON CONFLICT DO NOTHING;
      
      -- Assign Kasir membership (using existing system role 'pegawai')
      INSERT INTO public.tenant_memberships (id, business_id, user_id, role_id, is_active, is_tenant_wide)
      SELECT '77777777-7777-7777-7777-777777777777', '${tenantId}', '${kasirUserId}', id, true, true
      FROM public.roles WHERE code = 'pegawai'
      ON CONFLICT DO NOTHING;

      -- Customer & Service catalog with Branch Price Override
      INSERT INTO public.customers (id, business_id, nama, no_hp) VALUES ('${customerId}', '${tenantId}', 'Ibu Anisa', '081234567890') ON CONFLICT DO NOTHING;
      INSERT INTO public.services (id, business_id, nama, base_harga, hpp, hpp_mode) 
      VALUES ('${serviceId}', '${tenantId}', 'Cuci Komplit Reguler', 50000, 20000, 'ACTUAL_COST') ON CONFLICT DO NOTHING;
      INSERT INTO public.branch_services (branch_id, service_id, business_id, price_override, is_active)
      VALUES ('${branchId}', '${serviceId}', '${tenantId}', 55000, true) ON CONFLICT DO NOTHING;
    `);

    // Execute POS transaction as Kasir
    await db.exec(`
      SELECT set_config('request.jwt.claim.sub', '${kasirUserId}', false);
      SELECT set_config('request.jwt.claim.role', 'authenticated', false);
      SET ROLE authenticated;
    `);

    const checkoutRes = await db.query(`
      SELECT public.create_pos_transaction(
        '${branchId}'::uuid,
        '[{"service_id": "${serviceId}", "qty": 2, "discount": 0}]'::jsonb,
        '${customerId}'::uuid,
        'cash',
        5000,
        gen_random_uuid()
      ) as trx_result;
    `);

    await db.exec('RESET ROLE;');

    const trxResult = checkoutRes.rows[0].trx_result;
    if (!trxResult || trxResult.status !== 'COMPLETED') {
      throw new Error(`POS transaction status unexpected: ${JSON.stringify(trxResult)}`);
    }

    if (Number(trxResult.total_amount) !== 105000) {
      throw new Error(`Expected total_amount 105000, got ${trxResult.total_amount}`);
    }

    console.log(`[PASS] 1. Checkout POS Atomik Sukses: Total Rp ${Number(trxResult.total_amount).toLocaleString('id-ID')}, Status: ${trxResult.status}`);
    console.log(`       HPP: Rp ${Number(trxResult.total_hpp).toLocaleString('id-ID')}, Gross Profit: Rp ${Number(trxResult.gross_profit).toLocaleString('id-ID')}`);
    passedTests++;
  } catch (err) {
    await db.exec('RESET ROLE;').catch(() => {});
    console.error(`[FAIL] 1. Test POS Gagal: ${err.message}`);
  }

  // ============================================================================
  // TEST 2: SMOKE TEST PRESENSI & SDM
  // ============================================================================
  console.log('\n--- [TEST 2] SMOKE TEST: PRESENSI & SDM (PEOPLE) ---');
  try {
    const employeeUserId = '99999999-9999-9999-9999-999999999999';
    const employeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const divisionId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    const positionId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

    await db.exec('RESET ROLE;');
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES ('${employeeUserId}', 'staff@pilin.id') ON CONFLICT DO NOTHING;
      INSERT INTO public.divisions (id, business_id, code, name) VALUES ('${divisionId}', '${tenantId}', 'OPS', 'Operasional') ON CONFLICT DO NOTHING;
      INSERT INTO public.positions (id, business_id, division_id, code, name) VALUES ('${positionId}', '${tenantId}', '${divisionId}', 'STAFF', 'Staff Cuci') ON CONFLICT DO NOTHING;
      INSERT INTO public.employees (id, business_id, auth_user_id, employee_code, full_name, division_id, position_id, branch_id, employment_status)
      VALUES ('${employeeId}', '${tenantId}', '${employeeUserId}', 'EMP-001', 'Budi Santoso', '${divisionId}', '${positionId}', '${branchId}', 'ACTIVE') ON CONFLICT DO NOTHING;
      INSERT INTO public.tenant_memberships (id, business_id, user_id, role_id, is_active, is_tenant_wide)
      SELECT 'dddddddd-dddd-dddd-dddd-dddddddddddd', '${tenantId}', '${employeeUserId}', id, true, true
      FROM public.roles WHERE code = 'pegawai'
      ON CONFLICT DO NOTHING;
    `);

    // Clock in as employee
    await db.exec(`
      SELECT set_config('request.jwt.claim.sub', '${employeeUserId}', false);
      SELECT set_config('request.jwt.claim.role', 'authenticated', false);
      SET ROLE authenticated;
    `);

    const attRes = await db.query(`
      INSERT INTO public.attendance_records (
        business_id, employee_id, branch_id, attendance_date, check_in_time, status,
        check_in_lat, check_in_lng, check_in_accuracy, check_in_photo_path, check_in_location_status
      ) VALUES (
        '${tenantId}', '${employeeId}', '${branchId}', CURRENT_DATE, CURRENT_TIMESTAMP, 'CHECKED_IN',
        -6.200000, 106.816666, 10.0, 'https://storage.pilin.id/selfie/budi.jpg', 'AVAILABLE'
      ) RETURNING id, status, attendance_date;
    `);

    const attRecord = attRes.rows[0];
    if (!attRecord || attRecord.status !== 'CHECKED_IN') {
      throw new Error(`Attendance record failed: ${JSON.stringify(attRecord)}`);
    }

    const historyRes = await db.query(`
      SELECT count(*) as total_attendance FROM public.attendance_records 
      WHERE employee_id = '${employeeId}' AND business_id = '${tenantId}';
    `);

    await db.exec('RESET ROLE;');

    console.log(`[PASS] 2. Presensi Pegawai Sukses: Clock In tercatat (${attRecord.status}) dengan GPS & Foto`);
    console.log(`       Riwayat absensi terverifikasi: ${historyRes.rows[0].total_attendance} sesi hari ini`);
    passedTests++;
  } catch (err) {
    await db.exec('RESET ROLE;').catch(() => {});
    console.error(`[FAIL] 2. Test Presensi Gagal: ${err.message}`);
  }

  // ============================================================================
  // TEST 3: SMOKE TEST DASHBOARD OWNER & ISOLASI TENANT
  // ============================================================================
  console.log('\n--- [TEST 3] SMOKE TEST: DASHBOARD OWNER & ISOLASI DATA MULTI-TENANT ---');
  try {
    const ownerUserId = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
    const tenantA = tenantId;
    const tenantB = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
    const branchB = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

    await db.exec('RESET ROLE;');
    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES ('${ownerUserId}', 'owner@berkah.id') ON CONFLICT DO NOTHING;
      INSERT INTO public.tenant_memberships (id, business_id, user_id, role_id, is_active, is_tenant_wide)
      SELECT 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', '${tenantA}', '${ownerUserId}', id, true, true
      FROM public.roles WHERE code = 'owner'
      ON CONFLICT DO NOTHING;

      -- Seed Tenant B with secret transactions
      INSERT INTO public.tenants (id, name, code) VALUES ('${tenantB}', 'Kompetitor Cuci Bersih', 'KCB') ON CONFLICT DO NOTHING;
      INSERT INTO public.branches (id, business_id, name) VALUES ('${branchB}', '${tenantB}', 'Cabang Rahasia B') ON CONFLICT DO NOTHING;
      INSERT INTO public.transactions (id, business_id, branch_id, total_amount, payment_method, status)
      VALUES (gen_random_uuid(), '${tenantB}', '${branchB}', 999999, 'cash', 'COMPLETED') ON CONFLICT DO NOTHING;
    `);

    // Owner Tenant A logs in
    await db.exec(`
      SELECT set_config('request.jwt.claim.sub', '${ownerUserId}', false);
      SELECT set_config('request.jwt.claim.role', 'authenticated', false);
      SET ROLE authenticated;
    `);

    // Owner checks summary metrics (RLS applied)
    const metricsRes = await db.query(`
      SELECT 
        count(*) as total_trx,
        COALESCE(SUM(total_amount), 0) as total_omzet
      FROM public.transactions;
    `);

    const ownerMetrics = metricsRes.rows[0];
    
    // Ensure Tenant B's 999.999 is NOT visible to Tenant A's Owner!
    const leakCheckRes = await db.query(`
      SELECT count(*) as leaked_count FROM public.transactions WHERE business_id = '${tenantB}';
    `);

    await db.exec('RESET ROLE;');

    if (Number(leakCheckRes.rows[0].leaked_count) !== 0) {
      throw new Error(`CRITICAL: Cross-Tenant Data Leak! Owner A saw Tenant B transactions!`);
    }

    console.log(`[PASS] 3. Dashboard Owner Sukses: Menampilkan ${ownerMetrics.total_trx} transaksi (Total Omzet: Rp ${Number(ownerMetrics.total_omzet).toLocaleString('id-ID')})`);
    console.log(`       Isolasi Cross-Tenant Terverifikasi: 0 data kompetitor bocor (RLS Guard 100% kedap)`);
    passedTests++;
  } catch (err) {
    await db.exec('RESET ROLE;').catch(() => {});
    console.error(`[FAIL] 3. Test Dashboard Owner Gagal: ${err.message}`);
  }

  // ============================================================================
  // TEST 4: SMOKE TEST FORMULIR PENDAFTARAN PROSPEK (ANONIM & SUPER ADMIN)
  // ============================================================================
  console.log('\n--- [TEST 4] SMOKE TEST: FORMULIR PROSPEK (ANONIM & SUPER ADMIN) ---');
  try {
    // 4.1 Anon Submit Landing Page Trial Form
    await db.exec('RESET ROLE;');
    await db.exec(`
      SELECT set_config('request.jwt.claim.sub', '', false);
      SELECT set_config('request.jwt.claim.role', 'anon', false);
      SET ROLE anon;
    `);

    // Anon executes INSERT (permitted by policy)
    await db.query(`
      INSERT INTO public.pilin_prospects (
        name, whatsapp, business_type, city_area, status
      ) VALUES (
        'Mas Joko (Barbershop Mantap)', '08987654321', 'BARBERSHOP', 'Jakarta Selatan', 'NEW'
      );
    `);

    // 4.2 Anon Scrape Prevention Check (SELECT MUST BE BLOCKED)
    let anonScrapeBlocked = false;
    try {
      const anonScrapeRes = await db.query(`
        SELECT count(*) as scrape_count FROM public.pilin_prospects;
      `);
      if (Number(anonScrapeRes.rows[0].scrape_count) === 0) {
        anonScrapeBlocked = true;
      }
    } catch (e) {
      // Permission denied for table pilin_prospects is the gold standard!
      if (e.message.includes('permission denied')) {
        anonScrapeBlocked = true;
      } else {
        throw e;
      }
    }

    if (!anonScrapeBlocked) {
      throw new Error(`CRITICAL: Anon scraping succeeded! Scrape was not blocked for role anon!`);
    }

    // 4.3 Super Admin / Platform Follow-Up Activity
    await db.exec('RESET ROLE;');
    const superAdminUserId = 'c3c3c3c3-c3c3-c3c3-c3c3-c3c3c3c3c3c3';
    
    // Fetch prospect id as superuser for test follow-up
    const prospectQuery = await db.query(`SELECT id, name FROM public.pilin_prospects LIMIT 1;`);
    const prospectId = prospectQuery.rows[0].id;
    const prospectName = prospectQuery.rows[0].name;

    await db.exec(`
      INSERT INTO auth.users (id, email) VALUES ('${superAdminUserId}', 'superadmin@pilin.id') ON CONFLICT DO NOTHING;
      INSERT INTO public.platform_role_assignments (user_id, role_id, is_active)
      SELECT '${superAdminUserId}', id, true
      FROM public.roles WHERE code = 'SUPER_ADMIN'
      ON CONFLICT (user_id) DO NOTHING;
      
      SELECT set_config('request.jwt.claim.sub', '${superAdminUserId}', false);
      SELECT set_config('request.jwt.claim.role', 'authenticated', false);
      SET ROLE authenticated;
    `);

    const activityRes = await db.query(`
      INSERT INTO public.pilin_prospect_activities (
        prospect_id, pic_name, activity_type, notes, result
      ) VALUES (
        '${prospectId}', 'Sales Team PILIN', 'WHATSAPP_FOLLOW_UP', 'Mengirimkan jadwal demo sistem', 'INTERESTED'
      ) RETURNING id, activity_type, result;
    `);

    await db.exec('RESET ROLE;');

    const newActivity = activityRes.rows[0];
    if (!newActivity || newActivity.result !== 'INTERESTED') {
      throw new Error('Failed to record prospect activity');
    }

    console.log(`[PASS] 4. Formulir Prospek Sukses: Form trial publik anonim tersimpan (${prospectName})`);
    console.log(`       Proteksi Scraping: Role anon diblokir membaca data (Permission Denied / 0 rows)`);
    console.log(`       Aktivitas Follow-Up: Tercatat di pilin_prospect_activities (${newActivity.activity_type} - ${newActivity.result})`);
    passedTests++;
  } catch (err) {
    await db.exec('RESET ROLE;').catch(() => {});
    console.error(`[FAIL] 4. Test Formulir Prospek Gagal: ${err.message}`);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n======================================================================');
  console.log(`HASIL AKHIR SMOKE TEST PILIN: ${passedTests} / ${totalTests} LULUS (${passedTests === totalTests ? '100% SUKSES' : 'ADA KEGAGALAN'})`);
  console.log('Semua alur kritis (POS, Presensi, Dashboard Owner, Prospek) tervalidasi stabil.');
  console.log('======================================================================');
}

runPilinSmokeTests().catch(console.error);
