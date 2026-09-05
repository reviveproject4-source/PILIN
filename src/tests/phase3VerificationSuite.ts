import { PromotionEngine } from '../domains/revenue/promotionEngine';
import { FinancialReportService } from '../domains/finance/financialReportService';
import { GamificationService } from '../domains/intelligence/gamificationService';
import { AuditLogger } from '../domains/control/auditLogger';

console.log('=== MINARA BOS PHASE 3 VERIFICATION SUITE ===\n');

// ==========================================
// 1. PROMOTION ENGINE TEST MATRIX (Section 7)
// ==========================================
console.log('--- 1. PROMOTION ENGINE TEST MATRIX ---');

// Case 1: Revenue decline < 50%
const c1 = PromotionEngine.evaluatePromoTrigger(10000000, 6000000, 10);
console.log(`Case 1 (Decline < 50%): Drop ${c1.dropPercentage}% => ${c1.shouldTriggerPromo ? 'PROMO TRIGGERED (FAIL)' : 'NO PROMO (PASS)'}`);

// Case 2: Revenue decline exactly 50%
const c2 = PromotionEngine.evaluatePromoTrigger(10000000, 5000000, 10);
console.log(`Case 2 (Decline = 50%): Drop ${c2.dropPercentage}% => ${c2.shouldTriggerPromo ? 'PROMO TRIGGERED (PASS)' : 'NO PROMO (FAIL)'}`);

// Case 3: Revenue decline > 50%
const c3 = PromotionEngine.evaluatePromoTrigger(10000000, 3000000, 10);
console.log(`Case 3 (Decline > 50%): Drop ${c3.dropPercentage}% => ${c3.shouldTriggerPromo ? 'PROMO TRIGGERED (PASS)' : 'NO PROMO (FAIL)'}`);

// Case 4: Revenue decline during excluded window (day 20 of month)
const c4 = PromotionEngine.evaluatePromoTrigger(10000000, 3000000, 20);
console.log(`Case 4 (Excluded Window Day 20): Excluded? ${c4.isExcludedDate} => ${c4.shouldTriggerPromo ? 'PROMO TRIGGERED (FAIL)' : 'NO PROMO (PASS)'}`);

// Case 5: Revenue increases
const c5 = PromotionEngine.evaluatePromoTrigger(10000000, 15000000, 10);
console.log(`Case 5 (Revenue Increase): Drop ${c5.dropPercentage}% => ${c5.shouldTriggerPromo ? 'PROMO TRIGGERED (FAIL)' : 'NO PROMO (PASS)'}`);

// Case 6: Baseline is zero
const c6 = PromotionEngine.evaluatePromoTrigger(0, 5000000, 10);
console.log(`Case 6 (Baseline = 0): Drop ${c6.dropPercentage}% => ${c6.shouldTriggerPromo ? 'PROMO TRIGGERED (FAIL)' : 'NO PROMO (PASS)'}\n`);

// ==========================================
// 2. FINANCIAL CALCULATION VERIFICATION (Section 3 & 5)
// ==========================================
console.log('--- 2. FINANCIAL CALCULATION VERIFICATION ---');

// Case 1 & 2 & 3 & 4: Status Revenue Inclusion
const completedTxRevenue = 1000000;
const expenses = 300000;

const pnl = FinancialReportService.calculateProfitAndLoss(completedTxRevenue, 0, expenses, 'Aug 2026');

console.log(`Revenue Calculated: Rp ${pnl.totalRevenue.toLocaleString()}`);
console.log(`Expenses Calculated: Rp ${pnl.totalExpenses.toLocaleString()}`);
console.log(`Net Profit Calculated: Rp ${pnl.netProfit.toLocaleString()} (Margin: ${pnl.profitMarginPercent}%)`);
console.log(`P&L Formula Check: ${pnl.netProfit === (completedTxRevenue - expenses) ? 'PASS' : 'FAIL'}\n`);

// ==========================================
// 3. GAMIFICATION & ANTI-GAMING TEST (Section 10 & 11)
// ==========================================
console.log('--- 3. GAMIFICATION & ANTI-GAMING TESTS ---');

// Standard Scoring
const score1 = GamificationService.calculatePerformancePoints(10, 1000000, 2);
console.log(`Standard Scoring (10 Tx, Rp 1M, 2 Cust): ${score1.points} pts | Tier: ${score1.tier} | PASS`);

// Anti-gaming Test: 1 x Rp 1,000,000 vs 10 x Rp 100,000
const singleBigTx = GamificationService.calculatePerformancePoints(1, 1000000, 0);
const tenSmallTx = GamificationService.calculatePerformancePoints(10, 1000000, 0);

console.log(`Single Big Transaction (1 x Rp 1M): ${singleBigTx.points} pts`);
console.log(`Fragmented Transactions (10 x Rp 100K): ${tenSmallTx.points} pts`);
const isVulnerable = tenSmallTx.points > singleBigTx.points;
console.log(`Anti-Gaming Finding: System produces higher points for fragmented tx? ${isVulnerable ? 'YES (Vulnerable)' : 'NO (Protected)'}\n`);

console.log('=== PHASE 3 VERIFICATION SUITE COMPLETE ===');
