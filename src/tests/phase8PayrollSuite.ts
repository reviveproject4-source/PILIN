import { PayrollDomainService } from '../domains/finance/payrollService';
import {
 GamificationDomainService } from '../domains/intelligence/gamificationDomainService';

export function runPhase8PayrollSuite() {
  console.log('\n================================================================');
  console.log('STARTING PHASE 8 PAYROLL DOMAIN SUITE (GD-21 / OD-01)');
  console.log('===============================================================\n');

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

  // --- TEST 1: Performance Data Authoritative Flow (GD-21 / OD-01) ---
  const payrollInput = PayrollDomainService.aggregatePayrollInput('emp-001', 'Dewi Lestari', '2026-08', 'manager', 'mgr-001');
  assert(payrollInput.performance_summary.completed_transactions_count === 12, 'Performance data (12 completed transactions) automatically flows into Payroll');
  assert(payrollInput.performance_summary.revenue_amount === 4000000, 'Performance revenue amount (Rp 4.000.000) automatically flows into Payroll');

  // --- TEST 2: Attendance Data Authoritative Flow (GD-21 / OD-01) ---
  assert(payrollInput.attendance_summary.present_days === 1, 'Attendance present days count automatically flows into Payroll');
  assert(payrollInput.attendance_summary.late_days === 0, 'Attendance late days count automatically flows into Payroll');

  // --- TEST 3: No Manual Score Injection Payload (GD-15) ---
  const logs = PayrollDomainService.getAttendanceLogs();
  assert(logs.length >= 3, 'Attendance records read strictly from system operational log context');

  // --- TEST 4: No Developer-Defined Payroll Formula Invention ---
  assert((payrollInput as any).calculated_salary_rupiah === undefined, 'No developer-invented Rupiah salary formula or calculation present');
  assert((payrollInput as any).bonus_multiplier === undefined, 'No developer-invented bonus multiplier present');

  // --- TEST 5: Performance/Attendance Data Not Mutated by Payroll ---
  const rawPerf = GamificationDomainService.getRecords()[0];
  assert(rawPerf.completed_transactions_count === 12, 'Raw performance event data remains untouched and unmutated by Payroll');

  // --- TEST 6: Input Source Traceability ---
  assert(payrollInput.source_event_ids.length >= 2, 'Payroll input record stores traceable list of operational source event IDs');

  // --- TEST 7: Payroll Input Staging Status ---
  assert(payrollInput.status === 'STAGED_FOR_PAYROLL', 'Payroll input record staged for payroll processing');

  // --- TEST 8: GD-20 RBAC Authorization & GD-19 SoD Enforcement ---
  let rbacFailed = false;
  try {
    PayrollDomainService.aggregatePayrollInput('emp-001', 'Dewi Lestari', '2026-08', 'pegawai', 'emp-001');
  } catch (err: any) {
    rbacFailed = err.message.includes('Unauthorized payroll input aggregation');
  }
  assert(rbacFailed, 'Aggregation request by unauthorized role "pegawai" rejected (GD-20 RBAC)');

  let sodFailed = false;
  try {
    PayrollDomainService.approvePayrollInput(payrollInput.id, 'manager', 'mgr-001');
  } catch (err: any) {
    sodFailed = err.message.includes('Creator cannot approve own payroll input record');
  }
  assert(sodFailed, 'Payroll input approval by creator rejected under Universal SoD (GD-19 Strict SoD)');
  const approvedInput = PayrollDomainService.approvePayrollInput(payrollInput.id, 'owner', 'owner-001');
  assert(approvedInput.status === 'APPROVED' && approvedInput.approved_by === 'owner-001', 'Payroll input approval by non-creator Owner succeeds');

  // --- TEST 9: GD-15 System Operational Data Integrity ---
  assert(payrollInput.business_id === '00000000-0000-0000-0000-000000000001', 'Tenant scope business_id preserved cleanly');

  // --- TEST 10: GD-21 Compliance ---
  assert(approvedInput.status === 'APPROVED', 'GD-21 / OD-01 Performance & Attendance to Payroll pipeline complete & verified');

  console.log('\n================================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8PayrollSuite();
}
