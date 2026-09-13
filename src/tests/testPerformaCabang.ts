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

  const branches = await PeopleRepository.listBranches('tenant-001');
  assert(branches.length >= 3, '1. Dynamic branch listing returns multi-branch list');

  const branchIds = branches.map(b => b.id);
  assert(branchIds.includes('branch-001'), '2. Branch-001 present in list');
  assert(branchIds.includes('branch-002'), '3. Branch-002 present in list');
  assert(branchIds.includes('branch-003'), '4. Branch-003 present in list');

  console.log('\n============================================================');
  console.log(`PERFORMA CABANG VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

verifyPerformaCabangModule();
