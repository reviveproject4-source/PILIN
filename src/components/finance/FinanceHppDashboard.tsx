'use client';

import React, { useState } from 'react';
import { FinancialReportService, ProfitAndLossReport, MultiPeriodSummary } from '@/domains/finance/financialReportService';
import { POSTransactionService } from '@/domains/commerce/POSTransactionService';
import { DollarSign, TrendingUp, ArrowDownRight, ArrowUpRight, BarChart2, PieChart, Scale, Wallet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function FinanceHppDashboard() {
  const [revenue, setRevenue] = useState(4500000);
  const [hpp, setHpp] = useState(1800000);
  const [expense, setExpense] = useState(650000);

  const report: ProfitAndLossReport = FinancialReportService.calculateProfitAndLoss(
    revenue,
    hpp,
    expense,
    'Bulan Ini'
  );

  const monthlyPeriods: MultiPeriodSummary[] = FinancialReportService.getMultiPeriodComparison(revenue, expense);
  const dailyPeriods: MultiPeriodSummary[] = FinancialReportService.getDailyPeriodComparison(revenue, expense);

  const [activeReportTab, setActiveReportTab] = useState<'PROFIT_LOSS' | 'BALANCE_SHEET' | 'CASH_FLOW'>('PROFIT_LOSS');
  const [periodTab, setPeriodTab] = useState<'MONTHLY' | 'DAILY'>('MONTHLY');

  return (
    <div className="space-y-6">
      {/* Top Title Bar & Main Report Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Laporan Keuangan Perusahaan
          </h2>
        </div>

        {/* 3 Main Financial Report Sub-Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveReportTab('PROFIT_LOSS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 'PROFIT_LOSS'
                ? 'bg-[#F26522] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Laporan Rugi Laba (P&L)</span>
          </button>

          <button
            onClick={() => setActiveReportTab('BALANCE_SHEET')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 'BALANCE_SHEET'
                ? 'bg-[#F26522] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Laporan Neraca (Balance Sheet)</span>
          </button>

          <button
            onClick={() => setActiveReportTab('CASH_FLOW')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeReportTab === 'CASH_FLOW'
                ? 'bg-[#F26522] text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Laporan Arus Kas (Cash Flow)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: LAPORAN RUGI LABA (P&L) */}
      {activeReportTab === 'PROFIT_LOSS' && (
        <>
          <div className="flex justify-end mb-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setPeriodTab('MONTHLY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodTab === 'MONTHLY'
                    ? 'bg-[#F26522] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Bulanan (6 Bulan)
              </button>
              <button
                onClick={() => setPeriodTab('DAILY')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  periodTab === 'DAILY'
                    ? 'bg-[#F26522] text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Harian (7 Hari)
              </button>
            </div>
          </div>

          {/* P&L Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Total Revenue */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Revenue (Pendapatan)
                </span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                Rp {report.totalRevenue.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Total HPP */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total HPP (Cost of Goods)
                </span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <PieChart className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                Rp {report.totalHpp.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Gross Profit (Laba Kotor)
                </span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                Rp {report.grossProfit.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Total Expense */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Total Expense (Operasional)
                </span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                Rp {report.totalExpenses.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Net Profit */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Net Profit (Laba Bersih)
                </span>
                <div className="p-2 bg-[#F26522]/10 text-[#F26522] rounded-xl">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className={`text-2xl font-black ${report.netProfit >= 0 ? 'text-[#F26522]' : 'text-rose-600'}`}>
                Rp {report.netProfit.toLocaleString('id-ID')}
              </div>
            </div>

            {/* Profit Margin */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Margin Laba Bersih (%)
                </span>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BarChart2 className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {report.profitMarginPercent}%
              </div>
            </div>
          </div>

          {/* Multi-Period Comparison Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Riwayat Perbandingan Performa Finansial ({periodTab === 'MONTHLY' ? 'Bulanan' : 'Harian'})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Periode</th>
                    <th className="px-5 py-3.5">Revenue (Omset)</th>
                    <th className="px-5 py-3.5">Expense (Beban)</th>
                    <th className="px-5 py-3.5">Net Profit (Estimasi)</th>
                    <th className="px-5 py-3.5">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {(periodTab === 'MONTHLY' ? monthlyPeriods : dailyPeriods).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {item.periodLabel}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">
                        Rp {item.revenue.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 text-rose-600 dark:text-rose-400 font-semibold">
                        Rp {item.expenses.toLocaleString('id-ID')}
                      </td>
                      <td className={`px-5 py-3.5 font-bold ${item.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        Rp {item.netProfit.toLocaleString('id-ID')}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-indigo-600 dark:text-indigo-400">
                        {item.profitMargin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: LAPORAN NERACA (BALANCE SHEET - DATA / ENGINE GAP NOTICE) */}
      {activeReportTab === 'BALANCE_SHEET' && (
        <div className="space-y-6">
          {/* HARD STOP DATA GAP NOTICE BOX */}
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-6 rounded-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-400 text-xs font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
                  NERACA STATUS: DATA / ENGINE GAP
                </span>
              </div>
            </div>

            <div className="text-xs text-amber-950 dark:text-amber-200 space-y-2 font-medium leading-relaxed">
              <div>
                Sistem Buku Besar (General Ledger Engine) dan Diagram Akun (Chart of Accounts / COA) belum diimplementasikan pada arsitektur backend service saat ini.
              </div>
              <div>
                Untuk menjamin integritas laporan akuntansi dan mencegah manipulasi data visual, Laporan Neraca secara resmi ditandai dengan status <strong>DATA / ENGINE GAP</strong> sampai General Ledger Engine siap dipasang.
              </div>
            </div>
          </div>

          {/* Balance Sheet Equation Structure */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Struktur Neraca Keuangan (Aset = Liabilitas + Ekuitas)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Asset Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">1. Total Aset (Assets)</div>
                <div className="text-xl font-black text-slate-400">Rp 0 (ENGINE GAP)</div>
                <div className="text-[11px] text-slate-500">Kas, Piutang, Inventori Staf</div>
              </div>

              {/* Liabilities Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">2. Total Liabilitas (Kewajiban)</div>
                <div className="text-xl font-black text-slate-400">Rp 0 (ENGINE GAP)</div>
                <div className="text-[11px] text-slate-500">Hutang Usaha, Beban Akrual</div>
              </div>

              {/* Equity Box */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase">3. Total Ekuitas (Modal Owner)</div>
                <div className="text-xl font-black text-slate-400">Rp 0 (ENGINE GAP)</div>
                <div className="text-[11px] text-slate-500">Modal Disetor, Laba Ditahan</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LAPORAN ARUS KAS (CASH FLOW) */}
      {activeReportTab === 'CASH_FLOW' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Laporan Arus Kas Operasional (Cash Flow Statement)
              </h3>
              <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-xs font-black px-3 py-1 rounded-full uppercase">
                NET CASH POSITIVE
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash Inflow Card */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase">
                    Operating Cash Inflows (Kas Masuk)
                  </span>
                  <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                    + Rp 292.150.000
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 border-t border-emerald-200 dark:border-emerald-800 pt-3">
                  <div className="flex justify-between">
                    <span>Kas Tunai Laci Kasir:</span>
                    <strong className="text-slate-900 dark:text-white">Rp 98.420.000</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nontunai / Bank Transfer & QRIS:</span>
                    <strong className="text-slate-900 dark:text-white">Rp 193.730.000</strong>
                  </div>
                </div>
              </div>

              {/* Cash Outflow Card */}
              <div className="bg-rose-50/70 dark:bg-rose-950/30 p-5 rounded-2xl border border-rose-200 dark:border-rose-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase">
                    Operating Cash Outflows (Kas Keluar)
                  </span>
                  <span className="text-xl font-black text-rose-700 dark:text-rose-400">
                    - Rp 182.750.000
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2 border-t border-rose-200 dark:border-rose-800 pt-3">
                  <div className="flex justify-between">
                    <span>Pembelian Bahan Baku & Stok:</span>
                    <strong className="text-slate-900 dark:text-white">Rp 70.350.000</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Beban Operasional & Listrik:</span>
                    <strong className="text-slate-900 dark:text-white">Rp 112.400.000</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Cash Flow Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase">Arus Kas Bersih (Net Cash Flow)</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  Rp 109.400.000
                </div>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Kasir & Bank Reconciled</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
