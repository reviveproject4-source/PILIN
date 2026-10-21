import { PeopleRepository } from '../domains/people/peopleRepository';

async function verifyPerformaCabangModule() {
  console.log('============================================================');
  console.log('VERIFYING OWNER "PERFORMA CABANG" MULTI-BRANCH MODULE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, name: string) {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  }

  // 1. VERIFIKASI JALUR LIVE TENANT: BERSIH DARI DATA DUMMY
  const liveBranches = await PeopleRepository.listBranches('tenant-001', false);
  assert(liveBranches.length === 0, '1. Jalur Live Tenant bersih dari data dummy (0 cabang default)');

  // 2. VERIFIKASI JALUR DEMO: DILENGKAPI 3 CABANG SIMULASI
  const demoBranches = await PeopleRepository.listBranches('demo-tenant', true);
  assert(demoBranches.length >= 3, '2. Jalur Demo mengembalikan multi-branch list');

  const branchIds = demoBranches.map(b => b.id);
  assert(branchIds.includes('branch-001'), '3. Branch-001 ada pada Jalur Demo');
  assert(branchIds.includes('branch-002'), '4. Branch-002 ada pada Jalur Demo');
  assert(branchIds.includes('branch-003'), '5. Branch-003 ada pada Jalur Demo');

  console.log('\n============================================================');
  console.log(`PERFORMA CABANG VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

verifyPerformaCabangModule();
