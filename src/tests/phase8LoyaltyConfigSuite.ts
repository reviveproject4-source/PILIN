import { LoyaltyConfigService } from '../domains/retention/loyaltyConfigService';

export function runPhase8LoyaltyConfigSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 TENANT LOYALTY & PROGRESS NOTIFICATION SUITE (GD-15)');
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

  // --- TEST 1: Load Dummy Tenant Default Configuration ---
  const defaultConfig = LoyaltyConfigService.getDefaultDummyConfig();
  assert(defaultConfig.earning_rate_rp === 10000, 'Dummy earning rate set to Rp 10,000 = 1 Point');
  assert(defaultConfig.reward_target_points === 100, 'Dummy reward target set to 100 Points');
  assert(defaultConfig.reward_value === 5 && defaultConfig.reward_type === 'DISCOUNT_PERCENTAGE', 'Dummy reward set to 5% Discount');
  assert(defaultConfig.after_reward_claim === 'RESET_POINT', 'Dummy post-reward behavior set to RESET_POINT');

  // --- TEST 2: Calculate Progress Milestones (25%, 50%, 75%, 90%, 100%) ---
  const progress25 = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-001',
    totalSpend: 250000, // Rp 250,000 -> 25 points -> 25%
  });
  assert(progress25.points_earned === 25 && progress25.progress_percentage === 25, 'Rp 250,000 spend yields 25 points and 25% progress');
  assert(progress25.crossed_milestone === 25 && progress25.should_notify === true, 'Crossing 25% triggers 25% milestone notification');

  const progress50 = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-001',
    totalSpend: 500000, // Rp 500,000 -> 50 points -> 50%
    lastNotifiedMilestone: 25,
  });
  assert(progress50.crossed_milestone === 50 && progress50.should_notify === true, 'Crossing 50% triggers 50% milestone notification');

  const progress75 = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-001',
    totalSpend: 750000, // Rp 750,000 -> 75 points -> 75%
    lastNotifiedMilestone: 50,
  });
  assert(progress75.crossed_milestone === 75 && progress75.should_notify === true, 'Crossing 75% triggers 75% milestone notification');

  const progress90 = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-001',
    totalSpend: 900000, // Rp 900,000 -> 90 points -> 90%
    lastNotifiedMilestone: 75,
  });
  assert(progress90.crossed_milestone === 90 && progress90.should_notify === true, 'Crossing 90% triggers 90% milestone notification');

  const progress100 = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-001',
    totalSpend: 1000000, // Rp 1,000,000 -> 100 points -> 100%
    lastNotifiedMilestone: 90,
  });
  assert(progress100.crossed_milestone === 100 && progress100.is_reward_ready === true, 'Reaching 100% progress unlocks reward');
  assert(Boolean(progress100.reward_description?.includes('Voucher Diskon 5%')), 'Reward description reads 5% Discount Voucher from configuration');

  // --- TEST 3: Duplicate Milestone Notification Protection ---
  const duplicateCheck = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-001',
    totalSpend: 250000,
    lastNotifiedMilestone: 25, // Already notified
  });
  assert(duplicateCheck.crossed_milestone === null && duplicateCheck.should_notify === false, 'Duplicate milestone notification prevented when already notified');

  // --- TEST 4: GD-16 Opt-Out Communication Guard ---
  const optOutCheck = LoyaltyConfigService.evaluateCustomerProgress({
    customerId: 'cust-optout',
    totalSpend: 500000,
    isOptedOut: true,
  });
  assert(optOutCheck.should_notify === false && optOutCheck.blocked_by_gd16_opt_out === true, 'Loyalty notification strictly blocked when customer has opted out (GD-16)');

  // --- TEST 5: Claim Reward & Point Reset ---
  const claimResult = LoyaltyConfigService.claimRewardAndReset('cust-001', 1050000);
  assert(claimResult.pointsReset === true && claimResult.remainingSpend === 50000, 'Claiming reward resets required spend (1M) and preserves excess spend (50k)');

  // --- TEST 6: Tenant Specific Configuration Update ---
  LoyaltyConfigService.updateTenantConfig('tenant-002', {
    earning_rate_rp: 5000, // Custom: Rp 5,000 = 1 Point
    reward_value: 10, // Custom: 10% Discount
  });
  const customConfig = LoyaltyConfigService.getTenantConfig('tenant-002');
  assert(customConfig.earning_rate_rp === 5000 && customConfig.reward_value === 10, 'Tenant configuration customization updated cleanly');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8LoyaltyConfigSuite();
}
