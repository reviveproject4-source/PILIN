export interface BaselineComparisonResult {
  previousWeekRevenue: number;
  currentPeriodRevenue: number;
  dropPercentage: number;
  isThresholdReached: boolean; // >= 50% drop
  isExcludedDate: boolean;     // Days 15-23 of the month
  shouldTriggerPromo: boolean;
}

export class PromotionEngine {

  /**
   * Compares previous week baseline vs current period revenue
   * Business Rule: Drop >= 50% triggers promo condition, EXCEPT on days 15-23 of the month.
   */
  static evaluatePromoTrigger(
    previousWeekRevenue: number,
    currentPeriodRevenue: number,
    currentDayOfMonth: number = new Date().getDate()
  ): BaselineComparisonResult {
    let dropPercentage = 0;
    
    if (previousWeekRevenue > 0) {
      dropPercentage = ((previousWeekRevenue - currentPeriodRevenue) / previousWeekRevenue) * 100;
    }

    const isThresholdReached = dropPercentage >= 50.0;
    
    // Exclusion dates: 15 to 23 of the month (gajian / mid-month pattern)
    const isExcludedDate = currentDayOfMonth >= 15 && currentDayOfMonth <= 23;

    const shouldTriggerPromo = isThresholdReached && !isExcludedDate;

    return {
      previousWeekRevenue,
      currentPeriodRevenue,
      dropPercentage: Math.max(0, Math.round(dropPercentage * 100) / 100),
      isThresholdReached,
      isExcludedDate,
      shouldTriggerPromo
    };
  }
}
