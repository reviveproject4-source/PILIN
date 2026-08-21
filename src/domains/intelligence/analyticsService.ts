export interface IntelligenceMetricsSummary {
  totalCustomers: number;
  repeatCustomersCount: number;
  repeatCustomerRatePercent: number;
  totalCompletedTransactions: number;
  averageTransactionValue: number;
  topService: { name: string; revenue: number };
  managementInsight: string;
}

export class AnalyticsService {

  /**
   * Converts operational raw data into actionable management insights (Section 46)
   */
  static generateManagementInsights(
    totalCustomers: number,
    repeatCustomersCount: number,
    totalCompletedTx: number,
    totalRevenue: number,
    topServiceName: string = 'Cuci & Blow Spa',
    topServiceRevenue: number = 5000000
  ): IntelligenceMetricsSummary {
    let repeatRate = 0;
    let avgTxValue = 0;

    if (totalCustomers > 0) {
      repeatRate = (repeatCustomersCount / totalCustomers) * 100;
    }

    if (totalCompletedTx > 0) {
      avgTxValue = totalRevenue / totalCompletedTx;
    }

    // Generate actionable insight based on operational patterns
    let insight = 'Operasional berjalan stabil. Pertahankan jadwal reminder retensi.';

    if (repeatRate < 30) {
      insight = 'PERHATIAN: Tingkat pelanggan berulang dibawah 30%. Tingkatkan frekuensi reminder retensi & aktifkan program Sapaan pelanggan.';
    } else if (repeatRate >= 50) {
      insight = 'PERFORMA UNGGUL: Tingkat pelanggan berulang di atas 50%. Pertimbangkan menaikkan harga layanan unggulan atau ekspansi cabang.';
    }

    return {
      totalCustomers,
      repeatCustomersCount,
      repeatCustomerRatePercent: Math.round(repeatRate * 100) / 100,
      totalCompletedTransactions: totalCompletedTx,
      averageTransactionValue: Math.round(avgTxValue),
      topService: {
        name: topServiceName,
        revenue: topServiceRevenue
      },
      managementInsight: insight
    };
  }
}
