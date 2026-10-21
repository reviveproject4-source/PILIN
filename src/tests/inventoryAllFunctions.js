const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

async function inventoryFunctions() {
  const db = new PGlite();

  // Setup environment
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
  `);

  // Apply all migrations
  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    let sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?uuid-ossp["']?;?/gi, '-- Extension built-in');
    try {
      await db.exec(sql);
    } catch (e) {
      if (f === '00045_prevent_overlapping_leave.sql' && e.message.includes('btree_gist')) {
        // skip in WASM
      } else {
        console.error(`Migration error in ${f}:`, e.message);
      }
    }
  }

  // 1. Inventory all functions in schema 'public'
  const funcsRes = await db.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prosecdef AS is_secdef,
      COALESCE(p.proconfig::text, 'NONE') AS search_path_config,
      p.provolatile
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.prosecdef DESC, p.proname;
  `);

  console.log('=== INVENTARISASI SEMUA FUNGSI POSTGRESQL DI SKEMA PUBLIC ===');
  console.log(`Total fungsi ditemukan: ${funcsRes.rows.length}`);

  // 2. Routine privileges
  const privsRes = await db.query(`
    SELECT routine_name, grantee, privilege_type
    FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
    ORDER BY routine_name, grantee;
  `);

  const privsMap = new Map();
  for (const row of privsRes.rows) {
    if (!privsMap.has(row.routine_name)) privsMap.set(row.routine_name, []);
    privsMap.get(row.routine_name).push(row.grantee);
  }

  console.log('\n--- DAFTAR FUNGSI SECURITY DEFINER ---');
  let secdefCount = 0;
  let secdefWithoutSearchPath = 0;
  let secdefPublicExecute = 0;

  for (const f of funcsRes.rows) {
    if (f.is_secdef) {
      secdefCount++;
      const grantees = privsMap.get(f.proname) || [];
      const hasSearchPath = f.search_path_config.includes('search_path');
      const isPublic = grantees.includes('PUBLIC');
      const isAnon = grantees.includes('anon');

      if (!hasSearchPath) secdefWithoutSearchPath++;
      if (isPublic || isAnon) secdefPublicExecute++;

      console.log(`[SECDEF] ${f.proname}(${f.args})`);
      console.log(`  search_path: ${f.search_path_config} | volatile: ${f.provolatile}`);
      console.log(`  grantees: [${grantees.join(', ')}]`);
    }
  }

  console.log(`\nRingkasan SECDEF:`);
  console.log(`Total: ${secdefCount}`);
  console.log(`Tanpa search_path: ${secdefWithoutSearchPath}`);
  console.log(`Terbuka ke PUBLIC/anon: ${secdefPublicExecute}`);

  console.log('\n--- DAFTAR FUNGSI NON-SECURITY DEFINER (SECURITY INVOKER) ---');
  for (const f of funcsRes.rows) {
    if (!f.is_secdef) {
      const grantees = privsMap.get(f.proname) || [];
      console.log(`[INVOKER] ${f.proname}(${f.args}) | grantees: [${grantees.join(', ')}]`);
    }
  }
}

inventoryFunctions().catch(console.error);
