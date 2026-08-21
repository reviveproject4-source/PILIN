import { ExpenseDomainService } from '../domains/finance/expenseService';
import { FinancialReportService } from '../domains/finance/financialReportService';

export function runPhase8ExpenseSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 FINANCE & EXPENSE DOMAIN SPECIFIC SUITE');
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

  // --- TEST 1: Retrieve Expenses (Schema 00011 Contract) ---
  const initialExpenses = ExpenseDomainService.getExpenses();
  assert(initialExpenses.length >= 2, 'Initial expense list contains at least 2 seed records (Schema 00011)');
  assert(initialExpenses[0].category === 'UTILITIES' && initialExpenses[0].amount === 1500000, 'Expense 1 category UTILITIES has amount 1,500,000');

  const totalExpenses = ExpenseDomainService.getTotalExpenses();
  assert(totalExpenses === 2500000, `Total initial expenses calculated correctly: Rp ${totalExpenses} (Expected: 2,500,000)`);

  // --- TEST 2: Calculate Initial P&L Report ---
  const revenue = 4000000;
  let pnl = FinancialReportService.calculateProfitAndLoss(revenue, totalExpenses);
  assert(pnl.totalRevenue === 4000000, 'P&L totalRevenue equals 4,000,000');
  assert(pnl.totalExpenses === 2500000, 'P&L totalExpenses equals 2,500,000');
  assert(pnl.netProfit === 1500000, 'P&L Net Profit equals 1,500,000 (Revenue - Expenses)');
  assert(pnl.profitMarginPercent === 37.5, 'P&L Net Profit Margin % equals 37.5%');

  // --- TEST 3: Record New Expense & Recalculate P&L ---
  const newExp = ExpenseDomainService.recordExpense({
    category: 'MAINTENANCE',
    amount: 500000,
    notes: 'Perbaikan Mesin Cuci Salon',
  });

  assert(newExp.category === 'MAINTENANCE' && newExp.amount === 500000, 'Newly recorded expense saved cleanly');
  
  const updatedTotalExpenses = ExpenseDomainService.getTotalExpenses();
  assert(updatedTotalExpenses === 3000000, `Updated total expenses equals Rp ${updatedTotalExpenses} (Expected: 3,000,000)`);

  pnl = FinancialReportService.calculateProfitAndLoss(revenue, updatedTotalExpenses);
  assert(pnl.netProfit === 1000000, 'Recalculated P&L Net Profit equals 1,000,000');
  assert(pnl.profitMarginPercent === 25, 'Recalculated Net Profit Margin % equals 25%');

  // --- TEST 4: GD-01 Tiered Expense Approval Thresholds ---
  const expSmall = ExpenseDomainService.recordExpense({
    category: 'UTILITIES',
    amount: 3000000, // <= 5M
    notes: 'Listrik Tambahan',
    created_by: 'cashier-001',
    created_by_role: 'CASHIER',
  });
  assert(expSmall.approval_tier === 'TIER_3_MANAGER', 'Expense <= Rp 5,000,000 assigned to Tier 3 Manager (GD-01)');

  const expLarge = ExpenseDomainService.recordExpense({
    category: 'MAINTENANCE',
    amount: 6000000, // > 5M
    notes: 'Renovasi Atap Salon',
    created_by: 'cashier-001',
    created_by_role: 'CASHIER',
  });
  assert(expLarge.approval_tier === 'TIER_2_OWNER', 'Expense > Rp 5,000,000 assigned to Tier 2 Owner (GD-01)');

  let unauthorizedApprovalFailed = false;
  try {
    ExpenseDomainService.approveExpense(expLarge.id, 'manager', 'mgr-001');
  } catch (err: any) {
    unauthorizedApprovalFailed = err.message.includes('Tier 2 Owner authority required');
  }
  assert(unauthorizedApprovalFailed, 'Manager approval rejected for Tier 2 Owner expense (GD-01)');

  const approvedLarge = ExpenseDomainService.approveExpense(expLarge.id, 'owner', 'owner-001');
  assert(approvedLarge.status === 'APPROVED', 'Owner approval succeeds for Tier 2 Owner expense (GD-01)');

  // --- TEST 5: GD-02 Manager Creator Escalation & Self-Approval Block ---
  const expMgrCreated = ExpenseDomainService.recordExpense({
    category: 'SUPPLIES',
    amount: 1000000, // <= 5M but created by Manager
    notes: 'Pengadaan Produk Tambahan oleh Manager',
    created_by: 'mgr-001',
    created_by_role: 'MANAGER',
  });
  assert(expMgrCreated.approval_tier === 'TIER_2_OWNER', 'Manager-created expense automatically escalated to Tier 2 Owner (GD-02)');

  let mgrSelfApprovalFailed = false;
  try {
    ExpenseDomainService.approveExpense(expMgrCreated.id, 'manager', 'mgr-001');
  } catch (err: any) {
    mgrSelfApprovalFailed = err.message.includes('Creator cannot approve own expense record');
  }
  assert(mgrSelfApprovalFailed, 'Manager self-approval rejected under Strict SoD (GD-02 / GD-19)');

  const approvedMgrExp = ExpenseDomainService.approveExpense(expMgrCreated.id, 'owner', 'owner-001');
  assert(approvedMgrExp.status === 'APPROVED' && approvedMgrExp.approved_by === 'owner-001', 'Owner approval for Manager-created expense succeeds');

  // --- TEST 6: GD-03 Reversal Event Transaction ("Don't Erase") ---
  const expToReverse = ExpenseDomainService.recordExpense({
    category: 'OPERATIONAL',
    amount: 400000,
    notes: 'Biaya Pengiriman Salah Input',
    created_by: 'cashier-001',
    created_by_role: 'CASHIER',
  });
  ExpenseDomainService.approveExpense(expToReverse.id, 'manager', 'mgr-001');

  const reversal = ExpenseDomainService.createReversalEvent(expToReverse.id, 'Salah input nominal', 'manager', 'mgr-001');
  assert(expToReverse.status === 'REVERSED', 'Original expense status updated to REVERSED without deletion (GD-03 Don\'t Erase)');
  assert(reversal.amount === -400000, 'Reversal record creates balancing negative amount (-400,000) (GD-03)');
  assert(reversal.is_reversal === true && reversal.original_expense_id === expToReverse.id, 'Reversal record references original expense ID cleanly');

  // --- TEST 7: GD-19 Strict Separation of Duties Assertion ---
  const expCashier = ExpenseDomainService.recordExpense({
    category: 'UTILITIES',
    amount: 2000000,
    created_by: 'cashier-001',
    created_by_role: 'CASHIER',
  });

  let cashierSelfApproveFailed = false;
  try {
    ExpenseDomainService.approveExpense(expCashier.id, 'manager', 'cashier-001');
  } catch (err: any) {
    cashierSelfApproveFailed = err.message.includes('Creator cannot approve own expense record');
  }
  assert(cashierSelfApproveFailed, 'Creator self-approval strictly rejected regardless of role claim (GD-19)');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8ExpenseSuite();
}

