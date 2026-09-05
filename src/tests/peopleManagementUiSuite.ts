import { PeopleRepository } from '@/domains/people/peopleRepository';
import { PeopleDomainService } from '@/domains/people/peopleDomainService';
import { PEOPLE_PERMISSIONS } from '@/domains/people/peoplePermissions';

export async function runPeopleManagementUiSuite() {
  console.log('\n============================================================');
  console.log('STARTING PEOPLE DOMAIN / EMPLOYEE MANAGEMENT UI SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  // Set mock mode for offline test runner
  PeopleRepository.setMockMode(true);
  PeopleRepository.clearMockData();

  const businessA = 'tenant-alpha';
  const businessB = 'tenant-beta';

  try {
    // 1. Division Creation
    const divDiv = await PeopleDomainService.createDivision('user-owner-01', {
      business_id: businessA,
      code: 'DIV-OPS',
      name: 'Operasi & Layanan',
      description: 'Divisi Operasional Utama',
    });
    console.log('[PASS] TEST 1: Division DIV-OPS created cleanly');
    passed++;

    // 2. Position Creation
    const posPos = await PeopleDomainService.createPosition('user-owner-01', {
      business_id: businessA,
      division_id: divDiv.id,
      code: 'POS-KASIR',
      name: 'Kasir Senior',
      level: 'STAFF',
    });
    console.log('[PASS] TEST 2: Position POS-KASIR created and linked to Division DIV-OPS');
    passed++;

    // 3. Employee Creation Without Auth Account (Offline Worker)
    const empOffline = await PeopleDomainService.createEmployee('user-owner-01', {
      business_id: businessA,
      employee_code: 'EMP-OFFLINE-001',
      full_name: 'Budi Offline Worker',
      branch_id: 'branch-001',
      division_id: divDiv.id,
      position_id: posPos.id,
    });

    if (!empOffline.auth_user_id) {
      console.log('[PASS] TEST 3: Employee created cleanly without auth_user_id (Offline Worker)');
      passed++;
    } else {
      console.error('[FAIL] TEST 3: Employee should not have auth_user_id');
      failed++;
    }

    // 4. Employee Creation With Linked Auth Account
    const empLinked = await PeopleDomainService.createEmployee('user-owner-01', {
      business_id: businessA,
      employee_code: 'EMP-LINKED-002',
      full_name: 'Siti Admin Kasir',
      auth_user_id: 'auth-user-siti-002',
      branch_id: 'branch-001',
      division_id: divDiv.id,
      position_id: posPos.id,
      supervisor_id: empOffline.id,
    });

    if (empLinked.auth_user_id === 'auth-user-siti-002' && empLinked.supervisor_id === empOffline.id) {
      console.log('[PASS] TEST 4: Employee created cleanly with linked auth_user_id and valid supervisor');
      passed++;
    } else {
      console.error('[FAIL] TEST 4: Employee auth account or supervisor link failed');
      failed++;
    }

    // 5. Duplicate Auth Account Link Blocked
    try {
      await PeopleDomainService.createEmployee('user-owner-01', {
        business_id: businessA,
        employee_code: 'EMP-LINKED-003',
        full_name: 'Dewi Duplicate Auth',
        auth_user_id: 'auth-user-siti-002', // Duplicate!
      });
      console.error('[FAIL] TEST 5: Duplicate auth_user_id was not blocked');
      failed++;
    } catch (err: any) {
      console.log('[PASS] TEST 5: Duplicate auth_user_id rejected cleanly:', err.message);
      passed++;
    }

    // 6. Supervisor Self-Reference Blocked
    try {
      await PeopleDomainService.updateEmployee('user-owner-01', empOffline.id, {
        supervisor_id: empOffline.id, // Self!
      });
      console.error('[FAIL] TEST 6: Supervisor self-reference was not blocked');
      failed++;
    } catch (err: any) {
      console.log('[PASS] TEST 6: Supervisor self-reference rejected cleanly:', err.message);
      passed++;
    }

    // 7. Multi-Hop Circular Supervisor Blocked (FIND-01: A -> B -> A)
    // empLinked (Siti) already has supervisor empOffline (Budi).
    // Now try to update empOffline (Budi) to report to empLinked (Siti).
    try {
      await PeopleDomainService.updateEmployee('user-owner-01', empOffline.id, {
        supervisor_id: empLinked.id, // Circular 2-hop A -> B -> A!
      });
      console.error('[FAIL] TEST 7: Multi-hop 2-cycle supervisor chain was not blocked');
      failed++;
    } catch (err: any) {
      console.log('[PASS] TEST 7: Multi-hop 2-cycle supervisor chain (A -> B -> A) rejected cleanly:', err.message);
      passed++;
    }

    // 8. Multi-Hop Circular Supervisor Blocked (FIND-01: 3-hop A -> B -> C -> A)
    const empC = await PeopleDomainService.createEmployee('user-owner-01', {
      business_id: businessA,
      employee_code: 'EMP-THREE-003',
      full_name: 'Agus Staff 3',
      supervisor_id: empLinked.id, // Agus reports to Siti (who reports to Budi)
    });

    try {
      await PeopleDomainService.updateEmployee('user-owner-01', empOffline.id, {
        supervisor_id: empC.id, // Circular 3-hop Budi -> Agus -> Siti -> Budi!
      });
      console.error('[FAIL] TEST 8: Multi-hop 3-cycle supervisor chain was not blocked');
      failed++;
    } catch (err: any) {
      console.log('[PASS] TEST 8: Multi-hop 3-cycle supervisor chain (A -> B -> C -> A) rejected cleanly:', err.message);
      passed++;
    }

    // 9. Valid Linear Chain (A -> B -> C -> NULL) Allowed
    const empD = await PeopleDomainService.createEmployee('user-owner-01', {
      business_id: businessA,
      employee_code: 'EMP-FOUR-004',
      full_name: 'Doni Top Manager',
    });

    const updatedOffline = await PeopleDomainService.updateEmployee('user-owner-01', empOffline.id, {
      supervisor_id: empD.id, // Budi now reports to Doni (Linear chain Budi -> Doni -> NULL)
    });

    if (updatedOffline.supervisor_id === empD.id) {
      console.log('[PASS] TEST 9: Valid linear supervisor chain (A -> B -> C -> NULL) allowed');
      passed++;
    } else {
      console.error('[FAIL] TEST 9: Valid linear supervisor chain was not accepted');
      failed++;
    }

    // 10. Tenant Isolation Check
    const divB = await PeopleDomainService.createDivision('user-owner-02', {
      business_id: businessB,
      code: 'DIV-HR',
      name: 'Human Resources',
    });

    try {
      await PeopleDomainService.createEmployee('user-owner-01', {
        business_id: businessA,
        employee_code: 'EMP-CROSS-004',
        full_name: 'Joko Cross Tenant',
        division_id: divB.id, // Division from Tenant B!
      });
      console.error('[FAIL] TEST 10: Cross-tenant division assignment was not blocked');
      failed++;
    } catch (err: any) {
      console.log('[PASS] TEST 10: Cross-tenant division assignment rejected cleanly:', err.message);
      passed++;
    }

    // 11. Permission Constant Verification
    if (
      PEOPLE_PERMISSIONS.VIEW === 'people:employee:view' &&
      PEOPLE_PERMISSIONS.CREATE === 'people:employee:create' &&
      PEOPLE_PERMISSIONS.UPDATE === 'people:employee:update' &&
      PEOPLE_PERMISSIONS.MANAGE === 'people:employee:manage'
    ) {
      console.log('[PASS] TEST 11: Permission definitions verified');
      passed++;
    } else {
      console.error('[FAIL] TEST 11: Permission definitions mismatch');
      failed++;
    }

  } catch (err: any) {
    console.error('[SUITE ERROR]', err.message);
    failed++;
  }

  console.log(`\nPEOPLE MANAGEMENT UI SUITE SUMMARY: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

if (require.main === module) {
  runPeopleManagementUiSuite().catch(console.error);
}
