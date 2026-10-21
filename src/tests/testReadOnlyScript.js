const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

async function testReadOnly() {
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
    CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$ SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon'); $$;
    CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; $$;
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
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE OR REPLACE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE plpgsql AS $$ BEGIN RETURN string_to_array(name, '/'); END; $$;
  `);

  // Apply baseline migrations
  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    let sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?uuid-ossp["']?;?/gi, '-- Extension built-in');
    try {
      await db.exec(sql);
    } catch (e) {
      if (f === '00045_prevent_overlapping_leave.sql' && e.message.includes('btree_gist')) {
        // Skip extension only
      } else {
        console.error(`Error in ${f}:`, e.message);
      }
    }
  }

  // Run all 5 queries in production_read_only_verification.sql
  const roSql = fs.readFileSync(path.join(migrationsDir, '../production_read_only_verification.sql'), 'utf-8');
  const cleanSql = roSql.replace(/--.*$/gm, '');
  const queries = cleanSql.split(';').map(q => q.trim()).filter(q => q.length > 0);

  console.log(`Executing ${queries.length} read-only verification queries against database...`);

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    console.log(`\n--- QUERY ${i + 1} RESULT ---`);
    const res = await db.query(q);
    console.table(res.rows);
  }

  console.log('\n[SUCCESS] Seluruh 5 Query Read-Only Berhasil Dieksekusi dengan Sempurna!');
}

testReadOnly().catch(e => {
  console.error(e);
  process.exit(1);
});
