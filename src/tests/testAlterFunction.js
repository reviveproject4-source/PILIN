const { PGlite } = require('@electric-sql/pglite');

async function testAlterFunction() {
  const db = new PGlite();

  await db.exec(`
    CREATE OR REPLACE FUNCTION public.my_secdef_func()
    RETURNS text LANGUAGE sql SECURITY DEFINER AS $$ SELECT 'hello'; $$;
  `);

  // Check search_path before
  const res1 = await db.query(`
    SELECT proname, proconfig FROM pg_proc WHERE proname = 'my_secdef_func';
  `);
  console.log('Before ALTER FUNCTION:', res1.rows);

  // Apply ALTER FUNCTION
  await db.exec(`
    ALTER FUNCTION public.my_secdef_func() SET search_path = public, pg_catalog;
  `);

  // Check search_path after
  const res2 = await db.query(`
    SELECT proname, proconfig FROM pg_proc WHERE proname = 'my_secdef_func';
  `);
  console.log('After ALTER FUNCTION:', res2.rows);
}

testAlterFunction();
