import {
  ACTIVATION_FEE_AMOUNT,
  MIN_SALDO_PILIN_TOPUP,
  WA_MESSAGE_UNIT_PRICE,
  LOW_BALANCE_ALERT_THRESHOLD,
  SALES_COMMISSION_RATE,
  CommercialDomainService
} from '../domains/commercial/commercialService';
import { UsageWalletService } from '../domains/commercial/usageWalletService';
import { SalesCommissionService } from '../domains/commercial/salesCommissionService';

function runCommercialPricingSuite() {
  console.log('============================================================');
  console.log('STARTING PILIN COMMERCIAL PRICING & FEATURE RULES V1.1 SUITE');
  console.log('============================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failedCount++;
    }
  }

  // --- GROUP 1: WALLET INITIAL BALANCE & MINIMUM TOP-UP ---
  UsageWalletService.resetToDefault();
  assert(UsageWalletService.getBalance() === 0, 'New customer default Saldo PILIN MUST be Rp 0 (Rule V1.1 #1)');

  const topup50k = UsageWalletService.topUpWallet(50000);
  assert(!topup50k.success, 'Top-up Rp 50,000 MUST be rejected (< Rp 100,000 minimum threshold)');
  assert(UsageWalletService.getBalance() === 0, 'Saldo PILIN remains Rp 0 after rejected top-up');

  const topup100k = UsageWalletService.topUpWallet(100000);
  assert(topup100k.success, 'Top-up Rp 100,000 MUST be accepted (== Rp 100,000 minimum threshold)');
  assert(UsageWalletService.getBalance() === 100000, 'Saldo PILIN updated to Rp 100,000');

  const topup250k = UsageWalletService.topUpWallet(250000);
  assert(topup250k.success, 'Top-up Rp 250,000 accepted');
  assert(UsageWalletService.getBalance() === 350000, 'Saldo PILIN updated to Rp 350,000');


  // --- GROUP 2: LOW BALANCE ALERT & DUPLICATION CONTROL ---
  UsageWalletService.resetToDefault();
  UsageWalletService.topUpWallet(100000); // Balance = 100,000
  assert(UsageWalletService.getActiveAlert() === null, 'No low-balance alert when Saldo PILIN >= Rp 15,000');

  // Deduct to exact 15,000 (242 msgs * 350 = 84,700 -> balance 15,300)
  UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 242,
    recipientRef: '628123456789'
  });
  assert(UsageWalletService.getBalance() === 15300, 'Balance is Rp 15,300');
  assert(UsageWalletService.getActiveAlert() === null, 'No alert yet at Rp 15,300 (threshold: < 15,000)');

  // Deduct 2 messages = Rp 700 -> balance 14,600 (< 15,000)
  UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 2,
    recipientRef: '628123456789'
  });
  assert(UsageWalletService.getBalance() === 14600, 'Balance falls to Rp 14,600');
  const alert1 = UsageWalletService.getActiveAlert();
  assert(alert1 !== null && alert1.currentBalance === 14600, 'Low balance alert triggered for Owner when balance < Rp 15,000');

  // Deduct another 2 messages = Rp 700 -> balance 13,900
  const alertCountBefore = UsageWalletService.getLedger().length;
  UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 2,
    recipientRef: '628123456789'
  });
  assert(UsageWalletService.getBalance() === 13900, 'Balance falls to Rp 13,900');
  const alert2 = UsageWalletService.getActiveAlert();
  assert(alert2?.id === alert1?.id, 'Duplication Control: NO repeated duplicate low-balance alert generated on subsequent messages');

  // Top up above 15,000 -> resets alert state
  UsageWalletService.topUpWallet(100000); // Balance = 113,900
  assert(UsageWalletService.getActiveAlert() === null, 'Alert state reset after topping up above Rp 15,000');


  // --- GROUP 3: WHATSAPP USAGE & ATOMIC DEDUCTION ---
  UsageWalletService.resetToDefault();
  UsageWalletService.topUpWallet(100000);

  const deduct1 = UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 1,
    recipientRef: '628111'
  });
  assert(deduct1.success && deduct1.totalCharge === 350, '1 WA message deducts Rp 350');
  assert(UsageWalletService.getBalance() === 99650, 'Remaining balance Rp 99,650');

  const deduct10 = UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 10,
    recipientRef: '628111'
  });
  assert(deduct10.success && deduct10.totalCharge === 3500, '10 WA messages deduct Rp 3,500');

  const deduct100 = UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 100,
    recipientRef: '628111'
  });
  assert(deduct100.success && deduct100.totalCharge === 35000, '100 WA messages deduct Rp 35,000');

  // Insufficient balance test
  UsageWalletService.resetToDefault();
  UsageWalletService.topUpWallet(100000); // Balance = 100,000
  const deductTooMuch = UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 300, // Rp 105,000 required
    recipientRef: '628999'
  });
  assert(!deductTooMuch.success, 'Sending blocked when Saldo PILIN is insufficient');
  assert(UsageWalletService.getBalance() === 100000, 'Saldo PILIN remains intact & never negative upon rejection');


  // --- GROUP 4: FEATURE ACTIVATION VALIDATION & BULK RESERVATION ---
  UsageWalletService.resetToDefault();
  UsageWalletService.topUpWallet(200000);
  UsageWalletService.setSubscribedFeatures(['SAPAAN']); // REMINDER & BLAS disabled

  const inactiveReminderSend = UsageWalletService.deductUsageFee({
    communicationType: 'CUSTOMER_RELATIONSHIP',
    featureCode: 'REMINDER',
    quantity: 1,
    recipientRef: '62888'
  });
  assert(!inactiveReminderSend.success, 'Inactive feature (REMINDER) WA dispatch is strictly BLOCKED');

  const activeSapaanSend = UsageWalletService.deductUsageFee({
    communicationType: 'CUSTOMER_RELATIONSHIP',
    featureCode: 'SAPAAN',
    quantity: 1,
    recipientRef: '62888'
  });
  assert(activeSapaanSend.success, 'Active feature (SAPAAN) WA dispatch is ALLOWED');

  // BLAS Bulk reservation check
  const bulkCheck = UsageWalletService.validateBulkReservation(1000); // Rp 350,000 required, balance 199,650
  assert(!bulkCheck.canProceed, 'BLAS bulk broadcast reservation BLOCKS campaign when balance < Rp 350,000');


  // --- GROUP 5: TRANSACTIONAL WHATSAPP INDEPENDENCE ---
  UsageWalletService.resetToDefault();
  UsageWalletService.topUpWallet(100000);
  UsageWalletService.setSubscribedFeatures([]); // ALL features inactive

  const posNotaSend = UsageWalletService.deductUsageFee({
    communicationType: 'TRANSACTIONAL',
    featureCode: 'POS',
    quantity: 1,
    recipientRef: '628777'
  });
  assert(posNotaSend.success, 'Transactional WA (POS Nota) can be sent without any Customer Relationship feature subscription');
  assert(posNotaSend.ledgerRecord.communicationType === 'TRANSACTIONAL', 'Transactional WA ledger entry logged correctly');


  // --- GROUP 6: SALES COMMISSION ENGINE ---
  const commAct = SalesCommissionService.calculateCommission({
    hasActivationFee: true,
    activationFeeAmount: 1000000
  });
  assert(commAct.activationFeeCommission === 50000, 'Activation Fee (Rp 1,000,000) generates 5% commission = Rp 50,000');

  const commFull = SalesCommissionService.calculateCommission({
    hasActivationFee: true,
    activationFeeAmount: 1000000,
    monthlyFeatureSubscriptionFee: 625000,
    walletDepositAmount: 500000,
    whatsAppUsageAmount: 35000
  });
  assert(commFull.recurringFeatureCommission === 31250, 'Recurring Feature Subscription (Rp 625,000) generates 5% commission = Rp 31,250');
  assert(commFull.walletDepositCommission === 0, 'Saldo PILIN Deposit (Rp 500,000) generates 0% commission (NON-COMMISSIONABLE)');
  assert(commFull.whatsAppUsageCommission === 0, 'WhatsApp Usage (Rp 35,000) generates 0% commission (NON-COMMISSIONABLE)');
  assert(commFull.totalCommissionEarned === 81250, 'Total sales commission = Rp 81,250');

  // Test New Feature & Feature Expansion 5%
  const commNewExp = SalesCommissionService.calculateCommission({
    hasActivationFee: false,
    newFeatureSubscriptionFee: 200000,
    featureExpansionFee: 150000
  });
  assert(commNewExp.newFeatureCommission === 10000, 'New Feature Subscription (Rp 200,000) generates 5% commission = Rp 10,000');
  assert(commNewExp.featureExpansionCommission === 7500, 'Feature Expansion (Rp 150,000) generates 5% commission = Rp 7,500');

  // Test Recurring Feature Subscription Billing Status & Cancellation
  const activeSuccessSub = SalesCommissionService.calculateRecurringSubscriptionCommission({
    featureCode: 'REMINDER',
    featureName: 'Reminder',
    monthlyPrice: 200000,
    salesOwnerId: 'SALES-01',
    salesOwnerName: 'Budi Sales (SALES-01)',
    subscriptionStatus: 'ACTIVE',
    billingStatus: 'SUCCESS',
    billingPeriod: '2026-08'
  });
  assert(activeSuccessSub === 10000, 'Active subscription with SUCCESS billing pays 5% recurring commission (Rp 10,000)');

  const cancelledSub = SalesCommissionService.calculateRecurringSubscriptionCommission({
    featureCode: 'REMINDER',
    featureName: 'Reminder',
    monthlyPrice: 200000,
    salesOwnerId: 'SALES-01',
    salesOwnerName: 'Budi Sales (SALES-01)',
    subscriptionStatus: 'CANCELLED',
    billingStatus: 'SUCCESS',
    billingPeriod: '2026-08'
  });
  assert(cancelledSub === 0, 'Cancelled feature subscription pays Rp 0 recurring commission');

  const failedBillingSub = SalesCommissionService.calculateRecurringSubscriptionCommission({
    featureCode: 'REMINDER',
    featureName: 'Reminder',
    monthlyPrice: 200000,
    salesOwnerId: 'SALES-01',
    salesOwnerName: 'Budi Sales (SALES-01)',
    subscriptionStatus: 'ACTIVE',
    billingStatus: 'FAILED',
    billingPeriod: '2026-08'
  });
  assert(failedBillingSub === 0, 'Unsuccessful billing period pays Rp 0 recurring commission for that period');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runCommercialPricingSuite();
