import { PeopleDomainService, PeopleRepository } from '../domains/people';

export async function runPeopleFoundationSuite(): Promise<{ passed: number; failed: number }> {
  console.log('\n============================================================');
  console.log('STARTING PEOPLE DOMAIN / EMPLOYEE FOUNDATION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Clear mock repository before test run
  PeopleRepository.clearMockData();

  const TENANT_A = '11111111-1111-1111-1111-111111111111';
  const TENANT_B = '22222222-2222-2222-2222-222222222222';
  const ACTOR_ID = '00000000-0000-0000-0000-000000000001';

  try {
    // 1. Create Divisions
    const divMarketingA = await PeopleDomainService.createDivision(ACTOR_ID, {
      business_id: TENANT_A,
      code: 'DIV-MKT',
      name: 'Marketing Division',
    });
    assert(divMarketingA.code === 'DIV-MKT', 'Division created with uppercase code DIV-MKT');

    const divFinanceA = await PeopleDomainService.createDivision(ACTOR_ID, {
      business_id: TENANT_A,
      code: 'DIV-FIN',
      name: 'Finance Division',
    });

    // 2. Create Position
    const posMktManager = await PeopleDomainService.createPosition(ACTOR_ID, {
      business_id: TENANT_A,
      division_id: divMarketingA.id,
      code: 'POS-MKT-MGR',
      name: 'Marketing Manager',
    });
    assert(posMktManager.division_id === divMarketingA.id, 'Position linked to Marketing Division');

    // TEST 1 & 2: Employee Code Unique per Business & Same Code in Different Business
    const emp1A = await PeopleDomainService.createEmployee(ACTOR_ID, {
      business_id: TENANT_A,
      employee_code: 'EMP-001',
      full_name: 'Budi Santoso',
      branch_id: 'BRANCH_001',
      division_id: divMarketingA.id,
      position_id: posMktManager.id,
      auth_user_id: 'USER_001',
    });
    assert(emp1A.employee_code === 'EMP-001', 'Employee EMP-001 created in Tenant A');

    let duplicateCodeError = false;
    try {
      await PeopleDomainService.createEmployee(ACTOR_ID, {
        business_id: TENANT_A,
        employee_code: 'EMP-001',
        full_name: 'Duplicated Code User',
      });
    } catch (err: any) {
      duplicateCodeError = err.message.includes('already exists');
    }
    assert(duplicateCodeError, 'TEST 1: Duplicate employee_code in same tenant is rejected');

    const divMarketingB = await PeopleDomainService.createDivision(ACTOR_ID, {
      business_id: TENANT_B,
      code: 'DIV-MKT',
      name: 'Marketing Division Tenant B',
    });
    const posMktManagerB = await PeopleDomainService.createPosition(ACTOR_ID, {
      business_id: TENANT_B,
      division_id: divMarketingB.id,
      code: 'POS-MKT-MGR',
      name: 'Marketing Manager Tenant B',
    });

    const emp1B = await PeopleDomainService.createEmployee(ACTOR_ID, {
      business_id: TENANT_B,
      employee_code: 'EMP-001',
      full_name: 'Budi Santoso Tenant B',
      branch_id: 'BRANCH_002',
      division_id: divMarketingB.id,
      position_id: posMktManagerB.id,
    });
    assert(emp1B.employee_code === 'EMP-001' && emp1B.business_id === TENANT_B, 'TEST 2: Same employee_code EMP-001 allowed in different business tenant');

    // TEST 3: Duplicate auth_user_id in same tenant rejected
    let duplicateAuthError = false;
    try {
      await PeopleDomainService.createEmployee(ACTOR_ID, {
        business_id: TENANT_A,
        employee_code: 'EMP-002',
        full_name: 'Duplicate Auth User',
        auth_user_id: 'USER_001', // Already linked to emp1A
      });
    } catch (err: any) {
      duplicateAuthError = err.message.includes('already linked');
    }
    assert(duplicateAuthError, 'TEST 3: Duplicate auth_user_id in same business tenant is rejected');

    // TEST 4 & 5: Division & Position tenant isolation
    let crossTenantDivError = false;
    try {
      await PeopleDomainService.createPosition(ACTOR_ID, {
        business_id: TENANT_A,
        division_id: divMarketingB.id, // Belongs to Tenant B
        code: 'POS-INVALID',
        name: 'Invalid Cross Tenant Position',
      });
    } catch (err: any) {
      crossTenantDivError = err.message.includes('does not belong to the same business tenant');
    }
    assert(crossTenantDivError, 'TEST 4 & 5: Cross-tenant division/position creation is rejected');

    // TEST 6: Position & Division Consistency
    let inconsistentDivError = false;
    try {
      await PeopleDomainService.createEmployee(ACTOR_ID, {
        business_id: TENANT_A,
        employee_code: 'EMP-003',
        full_name: 'Inconsistent Staff',
        division_id: divFinanceA.id, // Finance
        position_id: posMktManager.id, // Marketing Manager (Marketing Division)
      });
    } catch (err: any) {
      inconsistentDivError = err.message.includes('inconsistent');
    }
    assert(inconsistentDivError, 'TEST 6: Employee with position and inconsistent division is rejected');

    // TEST 7: Supervisor cannot be self
    let selfSupervisorError = false;
    try {
      await PeopleDomainService.updateEmployee(ACTOR_ID, emp1A.id, {
        supervisor_id: emp1A.id,
      });
    } catch (err: any) {
      selfSupervisorError = err.message.includes('cannot be their own supervisor');
    }
    assert(selfSupervisorError, 'TEST 7: Employee setting supervisor_id = self is rejected');

    // TEST 8: Supervisor must be ACTIVE
    const inactiveEmp = await PeopleDomainService.createEmployee(ACTOR_ID, {
      business_id: TENANT_A,
      employee_code: 'EMP-INACTIVE',
      full_name: 'Inactive Supervisor Candidate',
      employment_status: 'INACTIVE',
    });
    let inactiveSupervisorError = false;
    try {
      await PeopleDomainService.createEmployee(ACTOR_ID, {
        business_id: TENANT_A,
        employee_code: 'EMP-004',
        full_name: 'Subordinate Staff',
        supervisor_id: inactiveEmp.id,
      });
    } catch (err: any) {
      inactiveSupervisorError = err.message.includes('must be an ACTIVE employee');
    }
    assert(inactiveSupervisorError, 'TEST 8: Assigning an INACTIVE employee as supervisor is rejected');

    // TEST 9: Tenant isolation in Employee listing
    const tenantAEmployees = await PeopleRepository.listEmployees(TENANT_A);
    const tenantBEmployees = await PeopleRepository.listEmployees(TENANT_B);
    assert(tenantAEmployees.every(e => e.business_id === TENANT_A), 'TEST 9: Tenant A employee list contains strictly Tenant A records');
    assert(tenantBEmployees.every(e => e.business_id === TENANT_B), 'TEST 9: Tenant B employee list contains strictly Tenant B records');

    // TEST 10: Hard delete not available & Resigned Employee Status
    const resignedEmp = await PeopleDomainService.resignEmployee(ACTOR_ID, emp1A.id);
    assert(resignedEmp.employment_status === 'RESIGNED' && resignedEmp.is_active === false, 'TEST 10 & 11: Employee status transitions to RESIGNED (is_active=false) instead of physical delete');

    let reactivateResignedError = false;
    try {
      await PeopleDomainService.activateEmployee(ACTOR_ID, emp1A.id);
    } catch (err: any) {
      reactivateResignedError = err.message.includes('Resigned employee cannot be directly activated');
    }
    assert(reactivateResignedError, 'TEST 11: Activating a RESIGNED employee directly is blocked by business rule');

  } catch (err: any) {
    console.error('[UNEXPECTED ERROR IN PEOPLE SUITE]', err);
    failed++;
  }

  console.log(`\nPEOPLE FOUNDATION SUITE SUMMARY: ${passed} Passed, ${failed} Failed\n`);
  return { passed, failed };
}

// Execute directly if run via node
if (typeof require !== 'undefined' && require.main === module) {
  runPeopleFoundationSuite();
}
