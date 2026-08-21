import { PromotionDomainService } from '../domains/revenue/promotionService';
import { PromotionEngine } from '../domains/revenue/promotionEngine';

export function runPhase8PromotionSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 AUTO PROMOTION & DISCOUNT TRIGGER SUITE');
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

  // --- TEST 1: Retrieve Promotions (Schema 00013 Contract) ---
  const initialPromos = PromotionDomainService.getPromotions();
  assert(initialPromos.length >= 2, 'Initial promotion list contains at least 2 seed records (Schema 00013)');
  assert(initialPromos[0].code === 'GAJIAN10' && initialPromos[0].discount_type === 'PERCENTAGE', 'Promo 1 GAJIAN10 is PERCENTAGE 10%');
  assert(initialPromos[1].code === 'MINARA20K' && initialPromos[1].discount_type === 'FIXED_AMOUNT', 'Promo 2 MINARA20K is FIXED_AMOUNT 20,000');

  // --- TEST 2: Omzet Trend & Blackout Trigger Evaluator ---
  const evalActive = PromotionEngine.evaluatePromoTrigger(10000000, 4000000, 10); // 60% drop on day 10
  assert(evalActive.dropPercentage === 60, '60% revenue drop calculated accurately');
  assert(evalActive.shouldTriggerPromo === true, 'Promo trigger activated when drop >= 50% outside blackout window');

  const evalBlackout = PromotionEngine.evaluatePromoTrigger(10000000, 4000000, 18); // Day 18 blackout
  assert(evalBlackout.isExcludedDate === true, 'Day 18 correctly identified as blackout exclusion date');
  assert(evalBlackout.shouldTriggerPromo === false, 'Promo trigger blocked during blackout window');

  // --- TEST 3: Validate & Apply Promo Voucher ---
  const validApply = PromotionDomainService.validateAndApplyPromo('GAJIAN10', 150000);
  assert(validApply.isValid === true, 'Voucher GAJIAN10 valid for 150,000 spend');
  assert(validApply.discountAmount === 15000, '10% discount on 150,000 equals 15,000');

  const minSpendFail = PromotionDomainService.validateAndApplyPromo('MINARA20K', 100000);
  assert(minSpendFail.isValid === false, 'Voucher MINARA20K rejected due to minimum spend requirement (150,000)');

  // --- TEST 4: Create New Promotion Rule ---
  const created = PromotionDomainService.createPromotion({
    name: 'Promo Akhir Pekan',
    code: 'WEEKEND15',
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    min_spend: 120000,
  });

  assert(created.code === 'WEEKEND15', 'Newly created promo code set to WEEKEND15');
  assert(created.is_active === true, 'Newly created promo status set to ACTIVE');

  const updatedPromos = PromotionDomainService.getPromotions();
  assert(updatedPromos.length === initialPromos.length + 1, 'Updated promotion list includes newly created rule');

  // --- TEST 5: GD-05 Manual Discount Ceiling Policy ---
  const discount10Cashier = PromotionDomainService.validateManualDiscount(10, 'cashier');
  assert(discount10Cashier.isAllowed === true && discount10Cashier.requiresManagerAuth === false, 'Cashier manual discount <= 10% accepted without Manager auth (GD-05)');

  let discountOver10CashierFailed = false;
  try {
    PromotionDomainService.validateManualDiscount(15, 'cashier');
  } catch (err: any) {
    discountOver10CashierFailed = err.message.includes('requires Manager or Owner authorization');
  }
  assert(discountOver10CashierFailed, 'Cashier manual discount > 10% rejected without Manager authorization (GD-05)');

  const discount15Manager = PromotionDomainService.validateManualDiscount(15, 'manager');
  assert(discount15Manager.isAllowed === true && discount15Manager.requiresManagerAuth === true, 'Manager authorization permits > 10% manual discount (GD-05)');

  // --- TEST 6: GD-06 Expired / Invalid Voucher Enforcement & Override Block ---
  const expiredCheck = PromotionDomainService.validateAndApplyPromo('EXPIRED10', 100000);
  assert(expiredCheck.isValid === false && expiredCheck.message.includes('kadaluarsa'), 'Expired voucher code EXPIRED10 rejected automatically (GD-06)');

  let overrideAttemptFailed = false;
  try {
    PromotionDomainService.overrideVoucher('EXPIRED10', 'manager');
  } catch (err: any) {
    overrideAttemptFailed = err.message.includes('cannot be overridden manually');
  }
  assert(overrideAttemptFailed, 'Manual override of expired/invalid voucher rejected under any role (GD-06)');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8PromotionSuite();
}

