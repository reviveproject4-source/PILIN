const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

async function testPreFlight() {
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
  `);

  // Apply baseline migrations (00001 to 00050 + 20260901) to simulate CURRENT LIVE PRODUCTION STATE (72 tables)
  const migrationsDir = path.join(__dirname, '../../supabase/migrations');
  const allFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  const baselineFiles = allFiles.filter(f => !f.startsWith('20261021') && f !== '20260915113000_update_pilin_prospects_wadah.sql');

  for (const f of baselineFiles) {
    let sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
    sql = sql.replace(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+["']?uuid-ossp["']?;?/gi, '-- Extension built-in');
    try {
      await db.exec(sql);
    } catch (e) {
      if (f === '00045_prevent_overlapping_leave.sql' && e.message.includes('btree_gist')) {
        // skip
      } else {
        console.error(`Error in ${f}:`, e.message);
      }
    }
  }

  // Read pre_flight_prerequisites_check.sql
  const pfSql = fs.readFileSync(path.join(__dirname, '../../supabase/pre_flight_prerequisites_check.sql'), 'utf-8');
  const cleanSql = pfSql.replace(/--.*$/gm, '');
  const queries = cleanSql.split(';').map(q => q.trim()).filter(q => q.length > 0);

  console.log(`Executing ${queries.length} Pre-Flight Queries on Simulated Live Production Baseline...`);

  for (let i = 0; i < queries.length; i++) {
    console.log(`\n--- PRE-FLIGHT QUERY ${i + 1} RESULT ---`);
    const res = await db.query(queries[i]);
    console.table(res.rows);
  }
}

testPreFlight().catch(console.error);
