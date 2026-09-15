'use client';

import React, { useState } from 'react';
import { PromotionDomainService, PromotionRecord } from '@/domains/revenue/promotionService';

export interface PromotionReportItem extends PromotionRecord {
  promoted_items: string;
  inventory_related?: string;
  total_transactions: number;
  total_revenue: number;
  total_customers: number;
  period_start: string;
  period_end: string;
  branch_name: string;
  status: 'AKTIF' | 'BERAKHIR' | 'DIJADWALKAN';
}

interface LaporanPromosiOtomatisProps {
  isDemo?: boolean;
}

export function LaporanPromosiOtomatis({ isDemo = false }: LaporanPromosiOtomatisProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Official transactional promotion report records (FACTUAL REPORT DATA, ZERO ANALYSIS)
  const reportData: PromotionReportItem[] = isDemo ? [
    {
      id: 'prm-001',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: 'branch-001',
      branch_name: 'Cabang Utama (Jakarta)',
      name: 'Promo Happy Hours Jam Sepi (13.00 - 15.00)',
      code: 'HAPPYHOUR15',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      min_spend: 50000,
      category: 'TIME_BASED',
      is_active: true,
      expiry_date: '2026-12-31',
      created_at: '2026-08-01',
      promoted_items: 'Cuci Express & Treatment Premium',
      inventory_related: 'Sabun Liquid Rose 20L (2 Pcs)',
      total_transactions: 42,
      total_revenue: 14700000,
      total_customers: 38,
      period_start: '01 Ags 2026',
      period_end: '31 Des 2026',
      status: 'AKTIF',
    },
    {
      id: 'prm-002',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: 'branch-001',
      branch_name: 'Cabang Bandung',
      name: 'Promo Milestone Loyalty (Target 5x Service)',
      code: 'MILESTONE20',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      min_spend: 100000,
      category: 'MILESTONE',
      is_active: true,
      expiry_date: '2026-12-31',
      created_at: '2026-07-15',
      promoted_items: 'Seluruh Layanan Fast Track',
      inventory_related: 'Kit Restorasi Sepatu (1 Set)',
      total_transactions: 28,
      total_revenue: 8400000,
      total_customers: 24,
      period_start: '15 Jul 2026',
      period_end: '31 Des 2026',
      status: 'AKTIF',
    },
    {
      id: 'prm-003',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: 'branch-002',
      branch_name: 'Cabang Bogor',
      name: 'Promo Gajian Minimal Belanja (Rp 150rb)',
      code: 'GAJIAN10',
      discount_type: 'FIXED_AMOUNT',
      discount_value: 15000,
      min_spend: 150000,
      category: 'MIN_SPEND',
      is_active: true,
      expiry_date: '2026-12-31',
      created_at: '2026-08-01',
      promoted_items: 'Paket Laundry & Dry Clean Family',
      inventory_related: 'Parfum Fresh Linen (5 Botol)',
      total_transactions: 15,
      total_revenue: 4500000,
      total_customers: 15,
      period_start: '01 Ags 2026',
      period_end: '31 Des 2026',
      status: 'AKTIF',
    },
    {
      id: 'prm-004',
      business_id: '00000000-0000-0000-0000-000000000001',
      branch_id: 'branch-001',
      branch_name: 'Cabang Utama (Jakarta)',
      name: 'Promo Sapaan Pelanggan Inaktif (>60 Hari)',
      code: 'REENGAGE25',
      discount_type: 'PERCENTAGE',
      discount_value: 25,
      min_spend: 75000,
      category: 'RETENTION',
      is_active: false,
      expiry_date: '2026-08-10',
      created_at: '2026-07-01',
      promoted_items: 'Layanan Cuci Regular & Helmet Care',
      inventory_related: 'Pembersih Visor Helm (3 Botol)',
      total_transactions: 19,
      total_revenue: 5320000,
      total_customers: 18,
      period_start: '01 Jul 2026',
      period_end: '10 Ags 2026',
      status: 'BERAKHIR',
    },
  ] : [];

  // Filtering
  const filteredData = reportData.filter((item) => {
    const matchBranch = selectedBranch === 'ALL' || item.branch_name.includes(selectedBranch);
    const matchStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
    return matchBranch && matchStatus;
  });

  // Summary Metrics (PURE FACTUAL RECAP, NO ANALYSIS)
  const totalPromotions = filteredData.length;
  const totalTrxCount = filteredData.reduce((acc, curr) => acc + curr.total_transactions, 0);
  const totalOmzetPromo = filteredData.reduce((acc, curr) => acc + curr.total_revenue, 0);
  const totalCustCount = filteredData.reduce((acc, curr) => acc + curr.total_customers, 0);

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 font-sans transition-colors">
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0F2547] dark:text-white">
            Laporan Aktivitas Promosi Otomatis
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Cabang:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="ALL">Semua Cabang</option>
              <option value="Jakarta">Cabang Utama (Jakarta)</option>
              <option value="Bandung">Cabang Bandung</option>
              <option value="Bogor">Cabang Bogor</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Status Promosi:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="ALL">Semua Status</option>
              <option value="AKTIF">AKTIF</option>
              <option value="BERAKHIR">BERAKHIR</option>
              <option value="DIJADWALKAN">DIJADWALKAN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Fact Cards (NO INSIGHTS / NO RECOMMENDATIONS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Promosi Terdaftar</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{totalPromotions} Promosi</div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jumlah Transaksi Promo</div>
          <div className="text-2xl font-black text-[#2563EB] dark:text-blue-400">{totalTrxCount} Transaksi</div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total Omzet Transaksi Promo</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Rp {totalOmzetPromo.toLocaleString('id-ID')}</div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Jumlah Pelanggan Pengguna</div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{totalCustCount} Pelanggan</div>
        </div>
      </div>

      {/* Main Report Table */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
          Daftar Rincian Laporan Promosi
        </h2>

        {filteredData.length === 0 ? (
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold text-center">
            Tidak ada data laporan promosi yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                  <th className="p-3">Kode & Nama Promosi</th>
                  <th className="p-3">Produk / Layanan Dipromosikan</th>
                  <th className="p-3">Data Inventory Terkait</th>
                  <th className="p-3">Cabang</th>
                  <th className="p-3">Periode Promosi</th>
                  <th className="p-3 text-center">Jumlah Transaksi</th>
                  <th className="p-3 text-right">Nilai Omzet Promo</th>
                  <th className="p-3 text-center">Pelanggan</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 font-semibold">
                      <div className="font-bold text-slate-900 dark:text-white">{item.name}</div>
                      <div className="font-mono text-[10px] text-[#2563EB] dark:text-blue-400 mt-0.5">Kode: {item.code}</div>
                    </td>
                    <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{item.promoted_items}</td>
                    <td className="p-3 font-medium text-slate-600 dark:text-slate-400">{item.inventory_related || '-'}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{item.branch_name}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{item.period_start} - {item.period_end}</td>
                    <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{item.total_transactions} Trx</td>
                    <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">Rp {item.total_revenue.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{item.total_customers} Cust</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                        item.status === 'AKTIF' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                        item.status === 'BERAKHIR' ? 'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800' :
                        'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
