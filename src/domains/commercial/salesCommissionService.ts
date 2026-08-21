import { ACTIVATION_FEE_AMOUNT, SALES_COMMISSION_RATE } from './commercialService';

export type CommissionableTransactionType =
  | 'ACTIVATION_FEE'
  | 'NEW_FEATURE_SUBSCRIPTION'
  | 'FEATURE_EXPANSION'
  | 'RECURRING_FEATURE_SUBSCRIPTION';

export type NonCommissionableTransactionType =
  | 'SALDO_PILIN_DEPOSIT'
  | 'WHATSAPP_USAGE';

export interface RecurringFeatureSubscriptionRecord {
  featureCode: string;
  featureName: string;
  monthlyPrice: number;
  salesOwnerId: string;
  salesOwnerName: string;
  subscriptionStatus: 'ACTIVE' | 'CANCELLED';
  billingStatus: 'SUCCESS' | 'FAILED' | 'PENDING';
  billingPeriod: string; // e.g. '2026-08'
}

export interface SalesCommissionBreakdown {
  salesOwnerId: string;
  salesOwnerName: string;
  activationFee: number;
  activationFeeCommission: number; // 5% = Rp 50,000
  newFeatureFee: number;
  newFeatureCommission: number; // 5%
  featureExpansionFee: number;
  featureExpansionCommission: number; // 5%
  recurringFeatureFee: number;
  recurringFeatureCommission: number; // 5% paid every successful billing period for active subscriptions
  walletDepositAmount: number;
  walletDepositCommission: number; // 0% (NON-COMMISSIONABLE)
  whatsAppUsageAmount: number;
  whatsAppUsageCommission: number; // 0% (NON-COMMISSIONABLE)
  totalCommissionEarned: number;
  calculatedAt: string;
}

export class SalesCommissionService {
  /**
   * Calculate Sales Commission according to Authoritative Correction:
   * 5% commission applies to:
   *  - Activation Fee
   *  - New Feature Subscription
   *  - Feature Expansion
   *  - Recurring Feature Subscription (paid 5% every successful billing period as long as customer remains actively subscribed)
   *
   * If cancelled or unsuccessful billing for that period -> Rp 0 commission for that feature.
   * Deposit / Saldo PILIN = 0%
   * WhatsApp Usage = 0%
   */
  static calculateCommission(params: {
    salesOwnerId?: string;
    salesOwnerName?: string;
    hasActivationFee?: boolean;
    activationFeeAmount?: number;
    newFeatureSubscriptionFee?: number;
    featureExpansionFee?: number;
    recurringSubscriptions?: RecurringFeatureSubscriptionRecord[];
    monthlyFeatureSubscriptionFee?: number; // fallback summary
    walletDepositAmount?: number;
    whatsAppUsageAmount?: number;
  }): SalesCommissionBreakdown {
    const salesOwnerId = params.salesOwnerId || 'SALES-01';
    const salesOwnerName = params.salesOwnerName || 'Budi Sales (SALES-01)';
    const actFee = params.hasActivationFee !== false ? (params.activationFeeAmount || ACTIVATION_FEE_AMOUNT) : 0;
    const newFeatFee = params.newFeatureSubscriptionFee || 0;
    const expFeatFee = params.featureExpansionFee || 0;
    const walletDeposit = params.walletDepositAmount || 0;
    const waUsage = params.whatsAppUsageAmount || 0;

    let recurringFeatureFee = 0;
    let recurringFeatureCommission = 0;

    if (params.recurringSubscriptions && params.recurringSubscriptions.length > 0) {
      params.recurringSubscriptions.forEach(sub => {
        // Commission paid only if active and successful billing for that period
        if (sub.subscriptionStatus === 'ACTIVE' && sub.billingStatus === 'SUCCESS') {
          recurringFeatureFee += sub.monthlyPrice;
          recurringFeatureCommission += sub.monthlyPrice * SALES_COMMISSION_RATE; // 5%
        }
      });
    } else if (params.monthlyFeatureSubscriptionFee) {
      // Summary mode: assumes active successful subscriptions
      recurringFeatureFee = params.monthlyFeatureSubscriptionFee;
      recurringFeatureCommission = recurringFeatureFee * SALES_COMMISSION_RATE; // 5%
    }

    const activationFeeCommission = actFee * SALES_COMMISSION_RATE; // 5%
    const newFeatureCommission = newFeatFee * SALES_COMMISSION_RATE; // 5%
    const featureExpansionCommission = expFeatFee * SALES_COMMISSION_RATE; // 5%
    const walletDepositCommission = 0; // NON-COMMISSIONABLE
    const whatsAppUsageCommission = 0; // NON-COMMISSIONABLE

    const totalCommissionEarned =
      activationFeeCommission +
      newFeatureCommission +
      featureExpansionCommission +
      recurringFeatureCommission;

    return {
      salesOwnerId,
      salesOwnerName,
      activationFee: actFee,
      activationFeeCommission,
      newFeatureFee: newFeatFee,
      newFeatureCommission,
      featureExpansionFee: expFeatFee,
      featureExpansionCommission,
      recurringFeatureFee,
      recurringFeatureCommission,
      walletDepositAmount: walletDeposit,
      walletDepositCommission,
      whatsAppUsageAmount: waUsage,
      whatsAppUsageCommission,
      totalCommissionEarned,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Helper to evaluate single subscription recurring commission for a billing period
   */
  static calculateRecurringSubscriptionCommission(record: RecurringFeatureSubscriptionRecord): number {
    if (record.subscriptionStatus === 'ACTIVE' && record.billingStatus === 'SUCCESS') {
      return record.monthlyPrice * SALES_COMMISSION_RATE; // 5%
    }
    return 0; // Unsuccessful billing or cancelled -> Rp 0
  }
}
