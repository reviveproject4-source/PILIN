export interface PerformanceTier {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  points: number;
  badge: string;
}

export class GamificationService {

  /**
   * Computes Gamification Points & Tier Badges for Staff/Branches
   * Formula: 10 points per completed transaction + 1 point per Rp 10.000 revenue + 5 points per new customer
   */
  static calculatePerformancePoints(
    completedTxCount: number,
    totalRevenue: number,
    newCustomerCount: number
  ): PerformanceTier {
    const txPoints = completedTxCount * 10;
    const revenuePoints = Math.floor(totalRevenue / 10000);
    const customerPoints = newCustomerCount * 5;

    const totalPoints = txPoints + revenuePoints + customerPoints;

    let tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';
    let badge = '🥉 Bronze Branch';

    if (totalPoints >= 1000) {
      tier = 'PLATINUM';
      badge = '💎 Platinum Top Performer';
    } else if (totalPoints >= 500) {
      tier = 'GOLD';
      badge = '🥇 Gold Branch Champion';
    } else if (totalPoints >= 200) {
      tier = 'SILVER';
      badge = '🥈 Silver Branch Achiever';
    }

    return {
      tier,
      points: totalPoints,
      badge
    };
  }
}
