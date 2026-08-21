import { GamificationService, PerformanceTier } from './gamificationService';

export interface PerformanceRecord {
  id: string;
  branch_name: string;
  staff_name: string;
  period_date: string;
  completed_transactions_count: number;
  revenue_amount: number;
  new_customers_count: number;
  points_earned: number;
  rank_tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  badge: string;
  source_event_ids?: string[];
  created_at: string;
}

export class GamificationDomainService {
  private static mockRecords: PerformanceRecord[] = [];

  static getRecords(): PerformanceRecord[] {
    return [...this.mockRecords];
  }

  static calculateTier(txCount: number, revenue: number, newCustCount: number): PerformanceTier {
    return GamificationService.calculatePerformancePoints(txCount, revenue, newCustCount);
  }

  /**
   * GD-15 Operational System Ingestion Engine
   * Automatically aggregates objective operational events with full source_event_ids traceability.
   */
  static aggregateSystemPerformance(
    sourceEvents: {
      transactions: Array<{ id: string; total_amount: number }>;
      newCustomers: Array<{ id: string }>;
    },
    staffName: string
  ): PerformanceRecord {
    const completedTxCount = sourceEvents.transactions.length;
    const totalRevenue = sourceEvents.transactions.reduce((sum, t) => sum + t.total_amount, 0);
    const newCustomerCount = sourceEvents.newCustomers.length;
    const sourceEventIds = [
      ...sourceEvents.transactions.map(t => t.id),
      ...sourceEvents.newCustomers.map(c => c.id),
    ];

    const tierResult = GamificationService.calculatePerformancePoints(
      completedTxCount,
      totalRevenue,
      newCustomerCount
    );

    const newRecord: PerformanceRecord = {
      id: `gmf-${Date.now()}`,
      branch_name: 'Cabang Utama Jakarta',
      staff_name: staffName.trim(),
      period_date: new Date().toISOString().split('T')[0],
      completed_transactions_count: completedTxCount,
      revenue_amount: totalRevenue,
      new_customers_count: newCustomerCount,
      points_earned: tierResult.points,
      rank_tier: tierResult.tier,
      badge: tierResult.badge,
      source_event_ids: sourceEventIds,
      created_at: new Date().toISOString(),
    };

    this.mockRecords.unshift(newRecord);
    return newRecord;
  }

  /**
   * GD-15 Manual Input Guard
   * Direct manual injection of operational numbers without source_event_ids is strictly rejected.
   */
  static recordPerformance(data: {
    staff_name: string;
    completed_transactions_count: number;
    revenue_amount: number;
    new_customers_count: number;
    source_event_ids?: string[];
  }): PerformanceRecord {
    if (!data.source_event_ids || data.source_event_ids.length === 0) {
      throw new Error('Direct manual input of operational numbers rejected without authoritative source_event_ids (GD-15)');
    }

    const tierResult = GamificationService.calculatePerformancePoints(
      data.completed_transactions_count,
      data.revenue_amount,
      data.new_customers_count
    );

    const newRecord: PerformanceRecord = {
      id: `gmf-${Date.now()}`,
      branch_name: 'Cabang Utama Jakarta',
      staff_name: data.staff_name.trim(),
      period_date: new Date().toISOString().split('T')[0],
      completed_transactions_count: data.completed_transactions_count,
      revenue_amount: data.revenue_amount,
      new_customers_count: data.new_customers_count,
      points_earned: tierResult.points,
      rank_tier: tierResult.tier,
      badge: tierResult.badge,
      source_event_ids: data.source_event_ids,
      created_at: new Date().toISOString(),
    };

    this.mockRecords.unshift(newRecord);
    return newRecord;
  }
}
