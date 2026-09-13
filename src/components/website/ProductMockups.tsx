'use client';

import React from 'react';
import { 
  TrendingUp, ShoppingBag, Users, Package, DollarSign, Wrench, 
  BarChart3, CheckCircle2, AlertCircle, ArrowUpRight, Sparkles, MessageCircle 
} from 'lucide-react';

// 1. Management Dashboard Dummy UI
export function ManagementDashboardMockup() {
  return (
    <div className="bg-[#0F2547] p-3 sm:p-4 rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-800 text-slate-900 font-sans">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-800 text-xs text-slate-400 font-mono">
        <div className="flex space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
        </div>
        <div className="bg-slate-900/90 px-4 py-1 rounded-md text-slate-300 font-sans font-semibold text-[11px]">
          Preview PILIN ERP — Management Dashboard
        </div>
        <div className="text-[#F26522] font-bold text-[11px] uppercase tracking-wider">LIVE SYSTEM</div>
      </div>

      {/* Main Dashboard UI */}
      <div className="bg-slate-50 p-4 sm:p-6 rounded-xl mt-3 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] text-slate-500 font-semibold mb-1">Penjualan Bulan Ini</div>
            <div className="text-lg sm:text-xl font-black text-[#0F2547]">Rp 128.450.000</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" />
              <span>+14.2% dari bulan lalu</span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] text-slate-500 font-semibold mb-1">Jumlah Transaksi</div>
            <div className="text-lg sm:text-xl font-black text-[#0F2547]">1.284 Nota</div>
            <div className="text-[11px] text-blue-600 font-bold mt-1">Tersinkron POS Harian</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] text-slate-500 font-semibold mb-1">Customer Terdaftar</div>
            <div className="text-lg sm:text-xl font-black text-[#0F2547]">842 Pelanggan</div>
            <div className="text-[11px] text-indigo-600 font-bold mt-1">Riwayat Pembelian Terjaga</div>
          </div>

          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-[11px] text-slate-500 font-semibold mb-1">Stok Menipis</div>
            <div className="text-lg sm:text-xl font-black text-[#F26522]">12 Produk</div>
            <div className="text-[11px] text-amber-600 font-bold mt-1">Perputaran Rendah</div>
          </div>
        </div>

        {/* Inner Insights & Activity Split */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
              <span className="font-bold text-[#0F2547] text-xs sm:text-sm">Business Insight Ringkas</span>
              <span className="text-[10px] font-extrabold bg-[#F26522]/10 text-[#F26522] px-2 py-0.5 rounded uppercase">Otostatus</span>
            </div>
            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>Penjualan kategori A meningkat 18% dibanding periode sebelumnya.</span>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>Beberapa produk menunjukkan perputaran yang rendah dalam 14 hari terakhir.</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="font-bold text-[#0F2547] text-xs sm:text-sm mb-2">Ringkasan Performa Agregat</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Total Omset Terkonsolidasi</span>
                  <span className="font-bold text-[#0F2547]">Rp 128.450.000</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="font-semibold text-slate-700">Estimasi Gross Profit Agregat</span>
                  <span className="font-bold text-emerald-600">Rp 56.450.000</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 font-mono text-right mt-3">Ringkasan Agregat PILIN ERP</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. POS Cashier Dummy UI
export function POSCashierMockup() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6 text-xs text-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="font-bold text-sm text-[#0F2547]">Preview PILIN POS / Kasir</div>
        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase">Fitur Gratis</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 space-y-2">
          <div className="font-bold text-slate-700">Item Terpilih</div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between font-semibold">
              <span>Layanan Care & Grooming Paket A</span>
              <span className="font-bold text-[#0F2547]">Rp 150.000</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Qty: 1 x Rp 150.000</span>
              <span className="text-[#F26522]">Diskon 10%</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 flex flex-col justify-between">
          <div>
            <div className="font-bold text-slate-700 mb-1">Struk / Nota Preview</div>
            <div className="text-[11px] text-slate-500 font-mono">
              <div>PILIN Store</div>
              <div>Nota #POS-8842</div>
              <div>Total: Rp 135.000</div>
              <div className="text-[#0F2547] font-bold mt-1">LUNAS (Cash)</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 italic">Transaksi menjadi data bisnis</div>
        </div>
      </div>
    </div>
  );
}

// 3. Business Insight Dummy UI
export function BusinessInsightMockup() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6 text-xs text-slate-800 space-y-3">
      <div className="font-bold text-sm text-[#0F2547] border-b border-slate-100 pb-2">
        Preview Business Insight PILIN
      </div>

      <div className="space-y-2.5">
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
          <span className="font-bold block">Perubahan Penjualan</span>
          <span>Penjualan minggu ini turun dibanding periode sebelumnya.</span>
        </div>

        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900">
          <span className="font-bold block">Status Inventory</span>
          <span>12 produk memiliki perputaran rendah dan memerlukan tindakan.</span>
        </div>

        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
          <span className="font-bold block">Tindak Lanjut Customer</span>
          <span>Customer terakhir melakukan transaksi 42 hari lalu.</span>
        </div>
      </div>
    </div>
  );
}

// 4. Service SPK Work Order Dummy UI
export function ServiceSPKMockup() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6 text-xs text-slate-800 space-y-3">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
        <span className="font-bold text-sm text-[#0F2547]">Preview Service / SPK</span>
        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">STATUS: PROSES</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
        <div><span className="font-bold text-slate-900 block">No SPK:</span> SPK-2026-08</div>
        <div><span className="font-bold text-slate-900 block">Customer:</span> Hendra W.</div>
        <div><span className="font-bold text-slate-900 block">PIC Teknisi:</span> Rian S.</div>
        <div><span className="font-bold text-slate-900 block">Estimasi Selesai:</span> Hari ini, 16.00</div>
      </div>
    </div>
  );
}

// 5. Finance Breakdown Dummy UI
export function FinanceMockup() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-6 text-xs text-slate-800 space-y-3">
      <div className="font-bold text-sm text-[#0F2547] border-b border-slate-100 pb-2">
        Preview Finance & Profitability
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
        <div className="p-2.5 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block">Revenue</span>
          <span className="font-bold text-[#0F2547]">Rp 128.450.000</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block">HPP</span>
          <span className="font-bold text-slate-700">Rp 72.000.000</span>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg">
          <span className="text-slate-500 block">Gross Profit</span>
          <span className="font-bold text-blue-800">Rp 56.450.000</span>
        </div>
        <div className="p-2.5 bg-slate-50 rounded-lg">
          <span className="text-slate-500 block">Expense</span>
          <span className="font-bold text-slate-700">Rp 18.200.000</span>
        </div>
        <div className="col-span-2 sm:col-span-1 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
          <span className="text-emerald-700 block font-bold">Net Profit</span>
          <span className="font-black text-emerald-800">Rp 38.250.000</span>
        </div>
      </div>
    </div>
  );
}
