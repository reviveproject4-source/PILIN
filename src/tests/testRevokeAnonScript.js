const { PGlite } = require('@electric-sql/pglite');

async function testFullAnonLockdown() {
  const db = new PGlite();

  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;

    CREATE TABLE public.tenants (id int);
    CREATE TABLE public.employees (id int);
    CREATE VIEW public.view_daily_branch_financials AS SELECT 1 as id;
    CREATE TABLE public.pilin_prospects (id int);

    -- Simulate Supabase default privileges where anon has ALL
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

    -- HARDENING LOCKDOWN:
    BEGIN;
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
    
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES FROM anon;

    GRANT INSERT ON TABLE public.pilin_prospects TO anon;
    COMMIT;
  `);

  const res = await db.query(`
    SELECT table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon'
    ORDER BY table_name, privilege_type;
  `);

  console.log('Result for anon role table grants:');
  console.table(res.rows);

  const authRes = await db.query(`
    SELECT count(DISTINCT table_name) as auth_tables_count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'authenticated';
  `);
  console.log('Result for authenticated table count:');
  console.table(authRes.rows);
}

testFullAnonLockdown();
