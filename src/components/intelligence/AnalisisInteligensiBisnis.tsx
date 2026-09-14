'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Users, Building2, DollarSign, CheckCircle2, AlertCircle, BarChart3, ShieldCheck, Sparkles, Activity } from 'lucide-react';
import { POSTransactionService, POSTransaction } from '@/domains/commerce/POSTransactionService';
import { PromotionDomainService, PromotionRecord } from '@/domains/revenue/promotionService';
import { ExpenseDomainService, ExpenseRecord } from '@/domains/finance/expenseService';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { PayrollDomainService, AttendanceRecord } from '@/domains/finance/payrollService';
import { FinancialReportService } from '@/domains/finance/financialReportService';

interface AnalisisInteligensiBisnisProps {
  isDemo?: boolean;
}

export function AnalisisInteligensiBisnis({ isDemo = false }: AnalisisInteligensiBisnisProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('MONTHLY');
  const [selectedScope, setSelectedScope] = useState<string>('CONSOLIDATED');

  const [transactions, setTransactions] = useState<POSTransaction[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderQueueItem[]>([]);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadEngineData() {
      setIsLoading(true);
      try {
        let trxList: POSTransaction[] = [];
        try {
          trxList = await POSTransactionService.fetchTransactionsDb();
        } catch {
          trxList = POSTransactionService.getTransactions();
        }
        if (!trxList || trxList.length === 0) {
          trxList = POSTransactionService.getTransactions();
        }
        setTransactions(trxList);
        setExpenses(ExpenseDomainService.getExpenses());
        setWorkOrders(WorkQueueService.getOrders());
        setPromotions(PromotionDomainService.getPromotions());
        setAttendanceLogs(PayrollDomainService.getAttendanceLogs());
      } catch (err) {
        console.error('Error loading intelligence engine data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadEngineData();
  }, []);

  // Compute metrics dynamically from actual domain data
  const filteredTransactions = transactions.filter(t => {
    if (selectedScope === 'CONSOLIDATED') return true;
    if (selectedScope === 'JAKARTA') return t.branch_id === '00000000-0000-0000-0000-000000000010' || !t.branch_id;
    return true;
  });

  const completedTransactions = filteredTransactions.filter(t => t.status === 'COMPLETED');
  const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.total_amount, 0);
  const totalHpp = completedTransactions.reduce((sum, t) => sum + (t.total_hpp || 0), 0);
  const totalOpex = ExpenseDomainService.getTotalExpenses();
  const totalDiscount = filteredTransactions.reduce((sum, t) => {
    const itemDiscount = t.items ? t.items.reduce((iSum, i) => iSum + (i.discount || 0), 0) : 0;
    return sum + itemDiscount;
  }, 0);

  // Financial P&L calculation from FinancialReportService
  const pnlReport = FinancialReportService.calculateProfitAndLoss(totalRevenue, totalHpp, totalOpex);
  const netProfit = pnlReport.netProfit;
  const netMarginPercent = pnlReport.profitMarginPercent;
  const opexRatioPercent = totalRevenue > 0 ? ((totalOpex / totalRevenue) * 100).toFixed(1) : '0.0';

  // POS vs SPK metrics
  const totalPosCount = filteredTransactions.length;
  const completedPosCount = completedTransactions.length;
  const avgBasketSize = completedPosCount > 0 ? Math.round(totalRevenue / completedPosCount) : 0;
  const totalSpkCount = workOrders.length;
  const completedSpkCount = workOrders.filter(w => w.status === 'DELIVERED' || w.status === 'READY_FOR_PICKUP' || w.status === 'CLOSED').length;
  const qcPassedSpkCount = workOrders.filter(w => w.qc_status === 'PASSED').length;

  // Promotion metrics
  const activePromos = promotions.filter(p => p.is_active);
  const activePromoCount = activePromos.length;

  // HRD & Productivity metrics
  const presentStaffCount = attendanceLogs.filter(a => a.status === 'PRESENT').length;
  const lateStaffCount = attendanceLogs.filter(a => a.status === 'LATE').length;
  const spkPerStaffRatio = presentStaffCount > 0 ? (totalSpkCount / presentStaffCount).toFixed(1) : '0.0';

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 font-sans transition-colors">
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-[#0F2547] dark:text-white">
              Analisis Inteligensi Bisnis Executive Owner
            </h1>
            {isDemo && (
              <span className="bg-amber-500/20 text-amber-500 border border-amber-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                DEMO DATA
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Periode:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="MONTHLY">Bulan Ini (Jun 2026)</option>
              <option value="QUARTERLY">Kuartal Ini (Q2 2026)</option>
              <option value="YEARLY">Tahun Ini (2026)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Scope Cabang:</span>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-800 dark:text-white text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="CONSOLIDATED">Seluruh Cabang (Konsolidasi)</option>
              <option value="JAKARTA">Cabang Utama (Jakarta)</option>
              <option value="BANDUNG">Cabang Bandung</option>
              <option value="BOGOR">Cabang Bogor</option>
            </select>
          </div>
        </div>
      </div>

      {/* DEMO MODE VISUAL INTELLIGENCE SIGNALS */}
      {isDemo && (
        <div className="space-y-6">
          {/* Signal 1: Revenue Signal */}
          <div className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border border-emerald-800/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">1. REVENUE SIGNAL (Analisis Komposisi & Akselerasi Pendapatan)</h2>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                DEMO DATA • OPTIMAL
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Jam Puncak Transaksi (Peak Hours)</div>
                <div className="text-base font-black text-amber-400">14.00 - 18.00 WIB</div>
                <div className="text-slate-300">Menghasilkan <strong className="text-emerald-400">38% total omzet</strong> harian.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Layanan Margin Tertinggi</div>
                <div className="text-base font-black text-emerald-400">Treatment & Express Wash</div>
                <div className="text-slate-300">Gross Margin <strong className="text-emerald-400">62.0%</strong> per transaksi.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Rata-Rata Nilai Nota (Basket Size)</div>
                <div className="text-base font-black text-blue-400">Rp 126.400 / Trx</div>
                <div className="text-slate-300">Naik <strong className="text-emerald-400">+8.5%</strong> MoM dari cross-selling.</div>
              </div>
            </div>
          </div>

          {/* Signal 2: Operational Signal */}
          <div className="bg-gradient-to-br from-blue-950/20 to-slate-900 border border-blue-800/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">2. OPERATIONAL SIGNAL (Efisiensi Pengerjaan SPK & SLA Quality Gate)</h2>
                </div>
              </div>
              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                DEMO DATA • HIGH EFFICIENCY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">SLA Ketepatan Waktu Delivery</div>
                <div className="text-base font-black text-emerald-400">99.2% Tepat Waktu</div>
                <div className="text-slate-300">Target minimum sistem: <strong className="text-slate-200">95.0%</strong>.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Kecepatan Pengerjaan Rata-Rata</div>
                <div className="text-base font-black text-blue-400">42 Menit / SPK</div>
                <div className="text-slate-300">Termasuk tahapan Cuci, Pengeringan, & QC.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Status Bottleneck Antrean</div>
                <div className="text-base font-black text-emerald-400">0 Bottleneck</div>
                <div className="text-slate-300">Seluruh workstation produksi bekerja seimbang.</div>
              </div>
            </div>
          </div>

          {/* Signal 3: Customer Signal */}
          <div className="bg-gradient-to-br from-purple-950/20 to-slate-900 border border-purple-800/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">3. CUSTOMER SIGNAL (Retensi & Customer Lifetime Value)</h2>
                </div>
              </div>
              <span className="bg-purple-500/20 text-purple-400 border border-purple-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                DEMO DATA • LOYALTY HIGH
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Tingkat Repeat Order (30 Hari)</div>
                <div className="text-base font-black text-purple-400">68.4% Repeat Rate</div>
                <div className="text-slate-300">Didorong oleh WhatsApp Automatic Reminder.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Customer Lifetime Value (LTV)</div>
                <div className="text-base font-black text-emerald-400">Rp 1.850.000 / Pelanggan</div>
                <div className="text-slate-300">Akumulasi nilai transaksi dalam 12 bulan.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Skor Kepuasan Pelanggan (CSAT)</div>
                <div className="text-base font-black text-amber-400">4.9 / 5.0 Rating</div>
                <div className="text-slate-300">Berdasarkan 840 ulasan nota otomatis.</div>
              </div>
            </div>
          </div>

          {/* Signal 4: Branch Signal */}
          <div className="bg-gradient-to-br from-amber-950/20 to-slate-900 border border-amber-800/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">4. BRANCH SIGNAL (Matriks Produktivitas Lintas Cabang)</h2>
                </div>
              </div>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                DEMO DATA • MULTI-SITE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Jakarta Pusat (Benchmark Top)</div>
                <div className="text-base font-black text-amber-400">Rp 21.500.000 / Pegawai</div>
                <div className="text-slate-300">Omzet per pegawai tertinggi konsolidasi.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Bandung (High Growth)</div>
                <div className="text-base font-black text-emerald-400">Rp 17.830.000 / Pegawai</div>
                <div className="text-slate-300">Efisiensi OPEX membaik <strong className="text-emerald-400">+12%</strong>.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Bogor (Stabil)</div>
                <div className="text-base font-black text-blue-400">Rp 15.200.000 / Pegawai</div>
                <div className="text-slate-300">Potensi peningkatan paket langganan.</div>
              </div>
            </div>
          </div>

          {/* Signal 5: Cost & Labor Signal */}
          <div className="bg-gradient-to-br from-rose-950/20 to-slate-900 border border-rose-800/40 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">5. COST & LABOR SIGNAL (Rasio Beban Gaji & Operasional Ideal)</h2>
                </div>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                HEALTHY COST RATIO
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Rasio Labor Cost / Omzet</div>
                <div className="text-base font-black text-emerald-400">20.3% (Sangat Sehat)</div>
                <div className="text-slate-300">Batas aman industri: <strong className="text-amber-400">&lt; 25.0%</strong>.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">Rasio OPEX / Omzet</div>
                <div className="text-base font-black text-blue-400">29.3%</div>
                <div className="text-slate-300">Bahan baku & listrik dalam batas efisien.</div>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400 font-medium">ROI Investasi Mesin & Utilitas</div>
                <div className="text-base font-black text-purple-400">34.2% / Tahun</div>
                <div className="text-slate-300">Pengembalian modal peralatan optimal.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: ANALISIS KONDISI BIAYA TERHADAP PENDAPATAN */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
          Analisis Kondisi Biaya Terhadap Pendapatan (Financial Ratio Analysis)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Omzet Konsolidasi</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {isDemo ? 'Rp 485.500.000' : `Rp ${totalRevenue.toLocaleString('id-ID')}`}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {isDemo ? '3.840 Transaksi COMPLETED' : `${completedPosCount} Transaksi COMPLETED`}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Rasio OPEX / Omzet</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {isDemo ? '29.3%' : `${opexRatioPercent}%`}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-300">
              {isDemo ? 'Total OPEX: Rp 142.200.000' : `Total OPEX: Rp ${totalOpex.toLocaleString('id-ID')}`}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Labor Cost</div>
            <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
              {isDemo ? 'Rp 98.400.000' : `Rp ${totalHpp.toLocaleString('id-ID')}`}
            </div>
            <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {isDemo ? 'Rasio Gaji: 20.3% (Sehat)' : `Laba Kotor: Rp ${pnlReport.grossProfit.toLocaleString('id-ID')}`}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Margin Laba Bersih</div>
            <div className="text-2xl font-black text-[#2563EB] dark:text-blue-400">
              {isDemo ? '50.4%' : `${netMarginPercent}%`}
            </div>
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {isDemo ? 'Laba Bersih: Rp 244.900.000' : `Laba Bersih: Rp ${netProfit.toLocaleString('id-ID')}`}
            </div>
          </div>
        </div>

        {/* Matrix Financial Table */}
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                <th className="p-3">Scope / Cabang</th>
                <th className="p-3 text-right">Pendapatan Omzet</th>
                <th className="p-3 text-right">Labor Cost (Gaji)</th>
                <th className="p-3 text-right">Pengeluaran (OPEX)</th>
                <th className="p-3 text-right">Laba Bersih</th>
                <th className="p-3 text-center">Margin Laba %</th>
                <th className="p-3 text-center">Status Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-800 dark:text-slate-200">
              {isDemo ? (
                <>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Cabang Jakarta Pusat (Samanhudi)</td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Rp 215.000.000</td>
                    <td className="p-3 text-right text-purple-600 dark:text-purple-400">Rp 42.000.000 (19.5%)</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">Rp 60.500.000</td>
                    <td className="p-3 text-right font-black text-slate-900 dark:text-white">Rp 112.500.000</td>
                    <td className="p-3 text-center font-bold text-[#2563EB] dark:text-blue-400">52.3%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded font-bold text-[10px]">TOP PERFORMER</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Cabang Bandung (Asia Afrika)</td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Rp 160.500.000</td>
                    <td className="p-3 text-right text-purple-600 dark:text-purple-400">Rp 33.400.000 (20.8%)</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">Rp 47.300.000</td>
                    <td className="p-3 text-right font-black text-slate-900 dark:text-white">Rp 79.800.000</td>
                    <td className="p-3 text-center font-bold text-[#2563EB] dark:text-blue-400">49.7%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 rounded font-bold text-[10px]">HIGH PROFIT</span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">Cabang Bogor (Pajajaran)</td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Rp 110.000.000</td>
                    <td className="p-3 text-right text-purple-600 dark:text-purple-400">Rp 23.000.000 (20.9%)</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400">Rp 34.400.000</td>
                    <td className="p-3 text-right font-black text-slate-900 dark:text-white">Rp 52.600.000</td>
                    <td className="p-3 text-center font-bold text-[#2563EB] dark:text-blue-400">47.8%</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-400 rounded font-bold text-[10px]">STABLE GROWTH</span>
                    </td>
                  </tr>
                </>
              ) : (
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">Konsolidasi (Data Engine)</td>
                  <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">Rp {totalRevenue.toLocaleString('id-ID')}</td>
                  <td className="p-3 text-right text-purple-600 dark:text-purple-400">Rp {totalHpp.toLocaleString('id-ID')}</td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400">Rp {totalOpex.toLocaleString('id-ID')}</td>
                  <td className="p-3 text-right font-black text-slate-900 dark:text-white">Rp {netProfit.toLocaleString('id-ID')}</td>
                  <td className="p-3 text-center font-bold text-[#2563EB] dark:text-blue-400">{netMarginPercent}%</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 rounded font-bold text-[10px]">ENGINE WIRED</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


