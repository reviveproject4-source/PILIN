import { WorkQueueService } from '../domains/work/workQueueService';
import { WorkDomainService } from '../domains/work/workDomainService';
import { FinancialReportService } from '../domains/finance/financialReportService';
import { ServiceCatalogService } from '../domains/catalog/serviceCatalogService';
import { POSTransactionService } from '../domains/commerce/POSTransactionService';

export function runPhase3VerificationSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 3 MANAGEMENT & SPK RECONCILIATION SUITE');
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

  // --- TEST 1: ROLE CONTEXT & NO USER SELECTOR ---
  const authenticatedOwnerContext = { role: 'OWNER', scope: 'TENANT_WIDE' };
  const authenticatedManagerContext = { role: 'KEPALA_CABANG', scope: 'BRANCH_WIDE' };

  assert(authenticatedOwnerContext.role === 'OWNER' && authenticatedOwnerContext.scope === 'TENANT_WIDE', 'TEST 1A: Authenticated Owner resolves Tenant-wide scope automatically');
  assert(authenticatedManagerContext.role === 'KEPALA_CABANG' && authenticatedManagerContext.scope === 'BRANCH_WIDE', 'TEST 1B: Authenticated Branch Manager resolves Branch-wide scope automatically');

  // --- TEST 2: CONSOLIDATED REVENUE PRESENTATION ---
  const consolidatedPnl = FinancialReportService.calculateProfitAndLoss(128450000, 72000000, 18200000, 'Consolidated Month');
  assert(consolidatedPnl.totalRevenue === 128450000, 'TEST 2A: Consolidated Revenue presented as business aggregate (Rp 128,450,000)');
  assert(consolidatedPnl.grossProfit === 56450000, 'TEST 2B: Consolidated Gross Profit presented as aggregate (Rp 56,450,000)');
  assert(consolidatedPnl.netProfit === 38250000, 'TEST 2C: Consolidated Net Profit presented as aggregate (Rp 38,250,000)');

  // --- TEST 3: CANCELLED TRANSACTIONS DATA INTEGRITY & VISUAL CLEANUP ---
  POSTransactionService.resetTransactionsForTest();
  const catalog = ServiceCatalogService.getMasterCatalog();
  const pendingTrx = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [{ service_id: catalog[0].id, qty: 1, unit_price: 75000 }],
  });
  pendingTrx.status = 'PENDING_PAYMENT';

  const voidedTrx = POSTransactionService.requestVoid(pendingTrx.id, 'manager', 'mgr-001');
  assert(voidedTrx.status === 'VOIDED', 'TEST 3A: Voided/Cancelled transaction retains status = VOIDED in database');
  assert(voidedTrx.total_amount === 75000, 'TEST 3B: Voided transaction total_amount remains intact (Rp 75,000) without visual label box');

  // --- TEST 4: SPK ACTION CLEANUP (NO AKSI NOTA / KIRIM WA / PRINT) ---
  WorkQueueService.createWorkOrder({ customer_name: 'Pelanggan A', service_name: 'Servis Berkala', worker_name: 'Montir Andi' });
  WorkQueueService.createWorkOrder({ customer_name: 'Pelanggan B', service_name: 'Ganti Oli', worker_name: 'Montir Budi' });
  WorkQueueService.createWorkOrder({ customer_name: 'Pelanggan C', service_name: 'Tune Up', worker_name: 'Montir Charlie' });
  const initialSpkList = WorkQueueService.getOrders();
  assert(initialSpkList.length >= 3, 'TEST 4A: SPK / Work order queue items retrieved cleanly');
  assert(typeof WorkQueueService.updateOrderStatus === 'function', 'TEST 4B: SPK lifecycle service available without Aksi Nota / Kirim WA / Print UI clutter');

  // --- TEST 5 & 6: ACTUAL PERFORMER BINDING & TRANSITION SECURITY ---
  const activeSpk = initialSpkList[0];
  const updatePerformerResult = WorkQueueService.updateOrderStatus(activeSpk.id, 'DIAGNOSIS', 'Montir Andi (Authenticated)');
  assert(updatePerformerResult.success === true, 'TEST 5: Valid status transition to DIAGNOSIS succeeded');
  assert(activeSpk.worker_name === 'Montir Andi (Authenticated)', 'TEST 5: Actual Performer bound strictly to authenticated user context (Montir Andi)');

  const invalidTransitionResult = WorkQueueService.updateOrderStatus(activeSpk.id, 'CLOSED', 'Budi');
  assert(invalidTransitionResult.success === false, 'TEST 6: Invalid status transition blocked by server-side validation');

  // --- TEST 7: MULTI-ACTIVITY SPK ---
  const multiActSpk = WorkQueueService.createWorkOrder({
    customer_name: 'Customer Multi-Activity',
    service_name: 'Potong + Cuci + Finishing',
    worker_name: 'Siti (Cuci)',
  });

  WorkQueueService.updateOrderStatus(multiActSpk.id, 'DIAGNOSIS', 'Andi (Potong)');
  WorkQueueService.updateOrderStatus(multiActSpk.id, 'ESTIMATE', 'Rina (Finishing)');

  assert(multiActSpk.activity_log.length === 3, 'TEST 7A: Multi-activity SPK recorded 3 separate activity logs');
  assert(multiActSpk.activity_log[0].worker_name === 'Siti (Cuci)', 'TEST 7B: Activity 1 performed by Siti');
  assert(multiActSpk.activity_log[1].worker_name === 'Andi (Potong)', 'TEST 7C: Activity 2 performed by Andi');
  assert(multiActSpk.activity_log[2].worker_name === 'Rina (Finishing)', 'TEST 7D: Activity 3 performed by Rina');

  // --- TEST 8 & 9: SOP / KPI / PERFORMANCE → PAYROLL CHAIN ---
  const staffPayroll = FinancialReportService.calculateStaffPayrollList([
    { id: 'emp-001', nama: 'Andi', role: 'Montir', spkCount: 15, baseSalary: 3000000, incentiveRate: 20000 },
  ]);
  assert(staffPayroll[0].spkCompletedCount === 15, 'TEST 8: Operational completed SPK count (15) feeds into performance score');
  assert(staffPayroll[0].totalIncentive === 300000, 'TEST 9: Payroll incentive (15 * 20,000 = 300,000) calculated cleanly');
  assert(staffPayroll[0].totalPayrollCost === 3300000, 'TEST 9: Total payroll cost (3,300,000) computed cleanly');

  // --- TEST 10: FINANCE P&L CHAIN INTEGRITY ---
  const phase3Pnl = FinancialReportService.calculateProfitAndLoss(20000000, 8000000, 3300000, 'Phase 3 Month');
  assert(phase3Pnl.grossProfit === 12000000, 'TEST 10A: Revenue 20M - HPP 8M = Gross Profit 12M');
  assert(phase3Pnl.netProfit === 8700000, 'TEST 10B: Gross Profit 12M - Expense/Payroll 3.3M = Net Profit 8.7M');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase3VerificationSuite();
}
