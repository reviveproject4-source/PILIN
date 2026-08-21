export interface TenantLoyaltyConfig {
  business_id: string;
  program_status: 'ACTIVE' | 'INACTIVE';
  earning_rate_rp: number; // e.g. 10000 -> Rp 10.000 = 1 Point
  reward_target_points: number; // e.g. 100 Points
  reward_type: 'DISCOUNT_PERCENTAGE' | 'NOMINAL_DISCOUNT' | 'FREE_SERVICE';
  reward_value: number; // e.g. 5 for 5%
  milestones: number[]; // e.g. [25, 50, 75, 90, 100]
  point_expiration: 'NO_EXPIRATION' | string;
  reward_expiration_days: number; // e.g. 30 Days
  after_reward_claim: 'RESET_POINT' | 'ACCUMULATE_CONTINUOUS';
  maximum_points: number | null; // null = NO LIMIT
  notification_channel: 'IN_APP' | 'WHATSAPP' | 'SMS' | 'MULTI_CHANNEL';
  created_at: string;
  updated_at?: string;
}

export interface CustomerLoyaltyProgress {
  customer_id: string;
  total_spend: number;
  points_earned: number;
  progress_percentage: number;
  current_milestone: number;
  crossed_milestone: number | null;
  is_reward_ready: boolean;
  reward_description?: string;
  should_notify: boolean;
  blocked_by_gd16_opt_out: boolean;
}

export class LoyaltyConfigService {
  /**
   * Dummy Tenant Default Configuration
   * Serves as initial default template for tenant onboarding, fully customizable per tenant.
   */
  private static defaultDummyConfig: TenantLoyaltyConfig = {
    business_id: '00000000-0000-0000-0000-000000000001',
    program_status: 'ACTIVE',
    earning_rate_rp: 10000,
    reward_target_points: 100,
    reward_type: 'DISCOUNT_PERCENTAGE',
    reward_value: 5,
    milestones: [25, 50, 75, 90, 100],
    point_expiration: 'NO_EXPIRATION',
    reward_expiration_days: 30,
    after_reward_claim: 'RESET_POINT',
    maximum_points: null,
    notification_channel: 'IN_APP',
    created_at: new Date('2026-08-15').toISOString(),
  };

  private static tenantConfigs = new Map<string, TenantLoyaltyConfig>([
    ['00000000-0000-0000-0000-000000000001', { ...LoyaltyConfigService.defaultDummyConfig }],
  ]);

  static getDefaultDummyConfig(): TenantLoyaltyConfig {
    return { ...this.defaultDummyConfig };
  }

  static getTenantConfig(businessId: string): TenantLoyaltyConfig {
    const existing = this.tenantConfigs.get(businessId);
    if (existing) {
      return { ...existing };
    }
    return { ...this.defaultDummyConfig, business_id: businessId };
  }

  static updateTenantConfig(
    businessId: string,
    updates: Partial<Omit<TenantLoyaltyConfig, 'business_id'>>
  ): TenantLoyaltyConfig {
    const current = this.getTenantConfig(businessId);
    const updated: TenantLoyaltyConfig = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.tenantConfigs.set(businessId, updated);
    return updated;
  }

  /**
   * Evaluates Customer Loyalty Progress against Tenant Configuration & GD-16 Opt-Out Policy
   */
  static evaluateCustomerProgress(params: {
    customerId: string;
    totalSpend: number;
    lastNotifiedMilestone?: number;
    isOptedOut?: boolean;
    businessId?: string;
  }): CustomerLoyaltyProgress {
    const config = this.getTenantConfig(params.businessId || '00000000-0000-0000-0000-000000000001');

    if (config.program_status !== 'ACTIVE') {
      return {
        customer_id: params.customerId,
        total_spend: params.totalSpend,
        points_earned: 0,
        progress_percentage: 0,
        current_milestone: 0,
        crossed_milestone: null,
        is_reward_ready: false,
        should_notify: false,
        blocked_by_gd16_opt_out: false,
      };
    }

    const rawPoints = Math.floor(params.totalSpend / config.earning_rate_rp);
    const points = config.maximum_points !== null ? Math.min(rawPoints, config.maximum_points) : rawPoints;
    const rawProgress = Math.floor((points / config.reward_target_points) * 100);
    const progressPercentage = Math.min(100, rawProgress);

    // Identify highest crossed milestone
    const availableMilestones = [...config.milestones].sort((a, b) => a - b);
    let currentMilestone = 0;
    for (const m of availableMilestones) {
      if (progressPercentage >= m) {
        currentMilestone = m;
      }
    }

    const lastNotified = params.lastNotifiedMilestone || 0;
    const crossedMilestone = currentMilestone > lastNotified ? currentMilestone : null;
    const isRewardReady = progressPercentage >= 100;

    let rewardDesc = undefined;
    if (isRewardReady) {
      if (config.reward_type === 'DISCOUNT_PERCENTAGE') {
        rewardDesc = `Voucher Diskon ${config.reward_value}% (Berlaku ${config.reward_expiration_days} Hari)`;
      } else if (config.reward_type === 'NOMINAL_DISCOUNT') {
        rewardDesc = `Voucher Potongan Rp ${config.reward_value.toLocaleString('id-ID')} (Berlaku ${config.reward_expiration_days} Hari)`;
      } else {
        rewardDesc = `Layanan Gratis (Berlaku ${config.reward_expiration_days} Hari)`;
      }
    }

    // GD-16 Protection: If customer is opted out, notification MUST be blocked
    const isBlockedByGD16 = params.isOptedOut === true;
    const shouldNotify = crossedMilestone !== null && !isBlockedByGD16;

    return {
      customer_id: params.customerId,
      total_spend: params.totalSpend,
      points_earned: points,
      progress_percentage: progressPercentage,
      current_milestone: currentMilestone,
      crossed_milestone: crossedMilestone,
      is_reward_ready: isRewardReady,
      reward_description: rewardDesc,
      should_notify: shouldNotify,
      blocked_by_gd16_opt_out: isBlockedByGD16,
    };
  }

  /**
   * Resets customer loyalty points after reward is claimed (per after_reward_claim configuration)
   */
  static claimRewardAndReset(
    customerId: string,
    currentTotalSpend: number,
    businessId?: string
  ): { remainingSpend: number; pointsReset: boolean } {
    const config = this.getTenantConfig(businessId || '00000000-0000-0000-0000-000000000001');
    if (config.after_reward_claim === 'RESET_POINT') {
      const requiredSpend = config.reward_target_points * config.earning_rate_rp;
      const remainingSpend = Math.max(0, currentTotalSpend - requiredSpend);
      return { remainingSpend, pointsReset: true };
    }
    return { remainingSpend: currentTotalSpend, pointsReset: false };
  }
}
