import { PeopleRepository } from '../domains/people/peopleRepository';
import { AttendanceRepository } from '../domains/people/attendanceRepository';
import { AttendanceDomainService } from '../domains/people/attendanceDomainService';
import { AttendanceError } from '../domains/people/attendanceErrors';
import { ATTENDANCE_PERMISSIONS } from '../domains/people/attendancePermissions';
import { FixedClock } from '../domains/people/attendance.types';
import { AuditLogger } from '../domains/control/auditLogger';

export async function runAttendanceDomainSuite() {
  console.log('\n============================================================');
  console.log('STARTING PEOPLE V2 — ATTENDANCE DOMAIN SUITE (PHASE 2 HARDENED)');
  console.log('============================================================\n');

  PeopleRepository.setMockMode(true);
  AttendanceRepository.setMockMode(true);
  AuditLogger.setMockMode(true);
  AuditLogger.resetMockLogs();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  const tenantA = 'tenant-att-001';
  const branchMain = 'branch-att-main';
  const branchOther = 'branch-att-other';

  // Setup mock employees
  const empSelf = await PeopleRepository.createEmployee({
    business_id: tenantA,
    employee_code: 'EMP-ATT-01',
    full_name: 'Budi Santoso',
    auth_user_id: 'auth-user-budi',
    branch_id: branchMain,
  });

  const empOther = await PeopleRepository.createEmployee({
    business_id: tenantA,
    employee_code: 'EMP-ATT-02',
    full_name: 'Siti Aminah',
    auth_user_id: 'auth-user-siti',
    branch_id: branchMain,
  });

  const empInactive = await PeopleRepository.createEmployee({
    business_id: tenantA,
    employee_code: 'EMP-ATT-03',
    full_name: 'Joko Resigned',
    auth_user_id: 'auth-user-joko',
    branch_id: branchMain,
    employment_status: 'RESIGNED',
  });

  const empManagerMain = await PeopleRepository.createEmployee({
    business_id: tenantA,
    employee_code: 'EMP-MGR-01',
    full_name: 'Manajer Utama',
    auth_user_id: 'auth-user-manager-main',
    branch_id: branchMain,
  });

  const empManagerOther = await PeopleRepository.createEmployee({
    business_id: tenantA,
    employee_code: 'EMP-MGR-02',
    full_name: 'Manajer Cabang Lain',
    auth_user_id: 'auth-user-manager-other',
    branch_id: branchOther,
  });

  // ==================== 1. IDENTITY RESOLUTION ====================
  try {
    await AttendanceDomainService.clockIn({
      authUserId: 'auth-user-unlinked',
      business_id: tenantA,
      branch_id: branchMain,
      photoPath: 'tenant-att-001/emp-1/photo.jpg',
    });
    assert(false, 'TEST 1.1: Unlinked auth user should reject');
  } catch (err: any) {
    assert(err instanceof AttendanceError && err.code === 'EMPLOYEE_NOT_FOUND', 'TEST 1.1: Unlinked auth user rejected with EMPLOYEE_NOT_FOUND');
  }

  try {
    await AttendanceDomainService.clockIn({
      authUserId: 'auth-user-joko',
      business_id: tenantA,
      branch_id: branchMain,
      photoPath: 'tenant-att-001/emp-3/photo.jpg',
    });
    assert(false, 'TEST 1.2: Inactive employee should reject');
  } catch (err: any) {
    assert(err instanceof AttendanceError && err.code === 'EMPLOYEE_INACTIVE', 'TEST 1.2: Inactive employee rejected with EMPLOYEE_INACTIVE');
  }

  // ==================== 2. CLOCK & TIMEZONE DERIVATION TESTS ====================
  // Test Timezone Derivation (Asia/Jakarta boundary)
  const utcLateEvening = new Date('2026-09-10T17:50:00.000Z'); // 00:50 WIB on Sept 11
  const utcEarlyEvening = new Date('2026-09-10T16:50:00.000Z'); // 23:50 WIB on Sept 10

  const dateLateWib = AttendanceDomainService.deriveBusinessDate(utcLateEvening, 'Asia/Jakarta');
  const dateEarlyWib = AttendanceDomainService.deriveBusinessDate(utcEarlyEvening, 'Asia/Jakarta');

  assert(dateLateWib === '2026-09-11', 'TEST 2.1: UTC 17:50 (00:50 WIB) correctly derives business_date = 2026-09-11 in Asia/Jakarta');
  assert(dateEarlyWib === '2026-09-10', 'TEST 2.2: UTC 16:50 (23:50 WIB) correctly derives business_date = 2026-09-10 in Asia/Jakarta');

  // Injectable FixedClock Test
  const testClock = new FixedClock(new Date('2026-09-03T08:00:00.000Z'));
  let budiAttendanceRecordId = '';
  try {
    const res = await AttendanceDomainService.clockIn({
      authUserId: 'auth-user-budi',
      business_id: tenantA,
      branch_id: branchMain,
      photoPath: 'tenant-att-001/emp-budi/selfie1.jpg',
      lat: -6.200000,
      lng: 106.816666,
      accuracy: 10,
      locationStatus: 'AVAILABLE',
    }, [ATTENDANCE_PERMISSIONS.RECORD], testClock);
    
    budiAttendanceRecordId = res.record.id;
    assert(
      res.record.status === 'CHECKED_IN' && 
      res.record.check_in_time === '2026-09-03T08:00:00.000Z' &&
      res.record.attendance_date === '2026-09-03',
      'TEST 2.3: Valid Clock-In using FixedClock successful'
    );
  } catch (err: any) {
    assert(false, `TEST 2.3: Valid Clock-In with FixedClock failed: ${err.message}`);
  }

  // Duplicate Clock-In on same business date
  try {
    await AttendanceDomainService.clockIn({
      authUserId: 'auth-user-budi',
      business_id: tenantA,
      branch_id: branchMain,
      photoPath: 'tenant-att-001/emp-budi/selfie2.jpg',
    }, [ATTENDANCE_PERMISSIONS.RECORD], testClock);
    assert(false, 'TEST 2.4: Duplicate Clock-In on same date should reject');
  } catch (err: any) {
    assert(err instanceof AttendanceError && err.code === 'ATTENDANCE_ALREADY_EXISTS', 'TEST 2.4: Duplicate Clock-In rejected with ATTENDANCE_ALREADY_EXISTS');
  }

  // ==================== 3. CLOCK-OUT WORKFLOW ====================
  const clockOutTime = new FixedClock(new Date('2026-09-03T17:00:00.000Z'));
  try {
    const res = await AttendanceDomainService.clockOut({
      authUserId: 'auth-user-budi',
      business_id: tenantA,
      photoPath: 'tenant-att-001/emp-budi/out1.jpg',
    }, [ATTENDANCE_PERMISSIONS.RECORD], clockOutTime);

    assert(
      res.record.status === 'CHECKED_OUT' && 
      res.record.check_out_time === '2026-09-03T17:00:00.000Z',
      'TEST 3.1: Valid Clock-Out using FixedClock successful'
    );
  } catch (err: any) {
    assert(false, `TEST 3.1: Valid Clock-Out failed: ${err.message}`);
  }

  // ==================== 4. BRANCH SECURITY SCOPE TESTS ====================
  // Cross-branch manual entry using membership_branch_scopes authorization
  try {
    await AttendanceDomainService.createManualAttendance({
      actorAuthUserId: 'auth-user-manager-main', // Manager Main
      business_id: tenantA,
      employee_id: empOther.id,
      branch_id: branchOther, // Target branch is branchOther
      attendance_date: '2026-09-02',
      check_in_time: '2026-09-02T08:00:00.000Z',
      reason: 'Absen manual',
      authorizedBranchIds: [branchMain], // Security scope ONLY includes branchMain
    });
    assert(false, 'TEST 4.1: Manager without target branch in authorizedBranchIds should reject');
  } catch (err: any) {
    assert(err instanceof AttendanceError && err.code === 'UNAUTHORIZED', 'TEST 4.1: Manager without branch in authorizedBranchIds rejected with UNAUTHORIZED');
  }

  // Valid Manual Entry with authorizedBranchIds including target branch
  try {
    const res = await AttendanceDomainService.createManualAttendance({
      actorAuthUserId: 'auth-user-manager-main',
      business_id: tenantA,
      employee_id: empOther.id,
      branch_id: branchOther,
      attendance_date: '2026-09-02',
      check_in_time: '2026-09-02T08:00:00.000Z',
      reason: 'Pegawai bertugas di cabang lain, disetujui Manajer Area',
      photoPath: null, // Option A: NULL photo allowed
      authorizedBranchIds: [branchMain, branchOther], // Authorized scope includes branchOther
    });

    assert(
      res.record.check_in_photo_path === null && 
      res.record.check_in_location_status === 'MANUAL_ENTRY' &&
      res.record.branch_id === branchOther,
      'TEST 4.2: Manual Attendance with explicit authorizedBranchIds scope successful'
    );
  } catch (err: any) {
    assert(false, `TEST 4.2: Manual Attendance with authorizedBranchIds failed: ${err.message}`);
  }

  // ==================== 5. LEAVE WORKFLOW ====================
  let leaveRequestId = '';
  try {
    const res = await AttendanceDomainService.submitLeaveRequest({
      authUserId: 'auth-user-budi',
      business_id: tenantA,
      request_type: 'SICK',
      start_date: '2026-09-10',
      end_date: '2026-09-11',
      reason: 'Sakit flu berat',
    });
    leaveRequestId = res.request.id;
    assert(res.request.status === 'SUBMITTED', 'TEST 5.1: Leave request submitted successfully');
  } catch (err: any) {
    assert(false, `TEST 5.1: Leave request submission failed: ${err.message}`);
  }

  // Self-approval prohibition
  try {
    await AttendanceDomainService.reviewLeaveRequest({
      actorAuthUserId: 'auth-user-budi',
      business_id: tenantA,
      requestId: leaveRequestId,
      status: 'APPROVED',
    });
    assert(false, 'TEST 5.2: Leave self-approval should reject');
  } catch (err: any) {
    assert(err instanceof AttendanceError && err.code === 'SELF_APPROVAL_NOT_ALLOWED', 'TEST 5.2: Leave self-approval rejected with SELF_APPROVAL_NOT_ALLOWED');
  }

  // Valid Leave Approval
  try {
    const res = await AttendanceDomainService.reviewLeaveRequest({
      actorAuthUserId: 'auth-user-manager-main',
      business_id: tenantA,
      requestId: leaveRequestId,
      status: 'APPROVED',
    });
    assert(res.request.status === 'APPROVED', 'TEST 5.3: Leave request approved successfully by Manager');
  } catch (err: any) {
    assert(false, `TEST 5.3: Leave request approval failed: ${err.message}`);
  }

  // ==================== 6. OVERTIME WORKFLOW & LOCKED APPROVAL RULES ====================
  let overtimeRequestId = '';
  try {
    const res = await AttendanceDomainService.submitOvertimeRequest({
      authUserId: 'auth-user-budi',
      business_id: tenantA,
      attendance_record_id: budiAttendanceRecordId,
      claimed_minutes: 120,
      reason: 'Penuntusan laporan bulanan',
    });
    overtimeRequestId = res.request.id;
    assert(res.request.status === 'SUBMITTED' && res.request.approved_minutes === null, 'TEST 6.1: Overtime submitted successfully');
  } catch (err: any) {
    assert(false, `TEST 6.1: Overtime submission failed: ${err.message}`);
  }

  // Valid Overtime Approval (approved_minutes <= claimed_minutes)
  try {
    const res = await AttendanceDomainService.reviewOvertimeRequest({
      actorAuthUserId: 'auth-user-manager-main',
      business_id: tenantA,
      overtimeId: overtimeRequestId,
      status: 'APPROVED',
      approved_minutes: 90,
    });
    assert(res.request.status === 'APPROVED' && res.request.approved_minutes === 90, 'TEST 6.2: Overtime approval with approved_minutes <= claimed_minutes successful');
  } catch (err: any) {
    assert(false, `TEST 6.2: Overtime approval failed: ${err.message}`);
  }

  // ==================== 7. AUDIT PERSISTENCE VERIFICATION ====================
  const mockAuditLogs = AuditLogger.getMockLogs();
  const operationsFound = mockAuditLogs.map(l => l.operation);

  const expectedOperations = [
    'CLOCK_IN',
    'CLOCK_OUT',
    'MANUAL_ATTENDANCE_ENTRY',
    'LEAVE_SUBMITTED',
    'LEAVE_APPROVED',
    'OVERTIME_SUBMITTED',
    'OVERTIME_APPROVED'
  ];

  const allPersisted = expectedOperations.every(op => operationsFound.includes(op));
  assert(allPersisted && mockAuditLogs.length >= 7, 'TEST 7.1: All mandatory attendance operations generate persisted audit log entries in AuditLogger');

  console.log(`\n============================================================`);
  console.log(`ATTENDANCE DOMAIN SUITE SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`============================================================\n`);

  if (failed > 0) {
    throw new Error(`Attendance Domain Suite failed with ${failed} errors.`);
  }
}
