import { POSTransactionService } from '../domains/commerce/POSTransactionService';

export function runPhase8RefundSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 POS REFUND & VOID BOUNDARY SUITE (GD-09 / OD-03)');
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

  // --- TEST 1: Default Refund Approval Tiers (GD-09 / OD-03) ---
  const tier499k = POSTransactionService.evaluateRefundApprovalTier(499999);
  assert(tier499k === 'TIER_3_MANAGER', 'Refund < Rp 500,000 (499,999) routes to Tier 3 Manager (GD-09)');

  const tier500k = POSTransactionService.evaluateRefundApprovalTier(500000);
  assert(tier500k === 'TIER_2_OWNER', 'Refund exactly Rp 500,000 routes to Tier 2 Owner (OD-03 Fixed Boundary)');

  const tier501k = POSTransactionService.evaluateRefundApprovalTier(500001);
  assert(tier501k === 'TIER_2_OWNER', 'Refund > Rp 500,000 (500,001) routes to Tier 2 Owner (GD-09)');

  // --- TEST 2: Tenant Lower Threshold Configuration (OD-03) ---
  const tierTenantLower = POSTransactionService.evaluateRefundApprovalTier(350000, 300000);
  assert(tierTenantLower === 'TIER_2_OWNER', 'Tenant lower threshold (300,000) causes 350,000 refund to route to Owner (OD-03)');

  let tenantCeilingExceededFailed = false;
  try {
    POSTransactionService.evaluateRefundApprovalTier(400000, 600000);
  } catch (err: any) {
    tenantCeilingExceededFailed = err.message.includes('cannot exceed the governed ceiling of Rp 500,000');
  }
  assert(tenantCeilingExceededFailed, 'Tenant threshold > 500,000 strictly rejected (OD-03 Ceiling)');

  // --- TEST 3: Manager vs Owner Refund Authority Enforcement ---
  const trxSmall = POSTransactionService.getTransactionById('trx-00000000-0000-0000-0000-000000000001')!;
  const refundedSmall = POSTransactionService.processRefund({
    transactionId: trxSmall.id,
    refundAmount: 350000, // < 500k
    reason: 'Salah beli jasa',
    approverRole: 'manager',
    approverId: 'mgr-001',
  });
  assert(refundedSmall.status === ('REFUNDED' as any) && refundedSmall.approved_by === 'mgr-001', 'Manager approval succeeds for refund < 500,000 (GD-09)');

  const trxLarge = POSTransactionService.getTransactionById('trx-00000000-0000-0000-0000-000000000002')!;
  let managerOwnerTierRefundFailed = false;
  try {
    POSTransactionService.processRefund({
      transactionId: trxLarge.id,
      refundAmount: 750000, // >= 500k
      reason: 'Komplain layanan berat',
      approverRole: 'manager',
      approverId: 'mgr-001',
    });
  } catch (err: any) {
    managerOwnerTierRefundFailed = err.message.includes('Tier 2 Owner authority required');
  }
  assert(managerOwnerTierRefundFailed, 'Manager approval rejected for refund >= 500,000 (GD-09 / OD-03)');

  const refundedLarge = POSTransactionService.processRefund({
    transactionId: trxLarge.id,
    refundAmount: 750000,
    reason: 'Komplain layanan berat',
    approverRole: 'owner',
    approverId: 'owner-001',
  });
  assert(refundedLarge.status === ('REFUNDED' as any) && refundedLarge.approved_by === 'owner-001', 'Owner approval succeeds for refund >= 500,000 (GD-09 / OD-03)');

  // --- TEST 4: Separation of Duties (GD-19) & Unauthorized Approver Block ---
  const trxForCashier = POSTransactionService.getTransactionById('trx-00000000-0000-0000-0000-000000000004')!;
  let cashierApprovalFailed = false;
  try {
    POSTransactionService.processRefund({
      transactionId: trxForCashier.id,
      refundAmount: 100000,
      reason: 'Retur',
      approverRole: 'cashier',
      approverId: 'cashier-002',
    });
  } catch (err: any) {
    cashierApprovalFailed = err.message.includes('authority required');
  }
  assert(cashierApprovalFailed, 'Cashier approval rejected for refund (GD-09 RBAC)');

  // --- TEST 5: Refund vs Void Boundary Enforcement (GD-08 Protection) ---
  const trxCompletedForVoid = POSTransactionService.getTransactionById('trx-00000000-0000-0000-0000-000000000005')!;
  let voidCompletedFailed = false;
  try {
    POSTransactionService.requestVoid(trxCompletedForVoid.id, 'manager', 'mgr-001');
  } catch (err: any) {
    voidCompletedFailed = err.message.includes('cannot bypass Refund approval through Void');
  }
  assert(voidCompletedFailed, 'COMPLETED transaction prohibited from bypassing Refund via Void (GD-08 / GD-09 Boundary)');

  const trxPending = POSTransactionService.getTransactionById('trx-00000000-0000-0000-0000-000000000003')!;
  const voidedPending = POSTransactionService.requestVoid(trxPending.id, 'cashier', 'cashier-001');
  assert(voidedPending.status === 'VOIDED', 'Pre-completion PENDING_PAYMENT transaction successfully voided under GD-08 lifecycle');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8RefundSuite();
}
