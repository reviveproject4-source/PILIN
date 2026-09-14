'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  CheckCircle2, ArrowUpRight, Shield, Calendar, 
  HelpCircle, BarChart3, Database, Sparkles, Upload, Building2, Filter
} from 'lucide-react';
import { ManagementControlDashboard } from './ManagementControlDashboard';
import { PeopleManagementDashboard } from '../people/PeopleManagementDashboard';
import { FinanceHppDashboard } from '../finance/FinanceHppDashboard';
import { ProductMasterDashboard } from '../catalog/ProductMasterDashboard';
import { LaporanPromosiOtomatis } from '../promotion/LaporanPromosiOtomatis';
import { LaporanOtorisasiControl } from '../control/LaporanOtorisasiControl';
import { AnalisisInteligensiBisnis } from '../intelligence/AnalisisInteligensiBisnis';
import { IdentitasUsahaDashboard } from './IdentitasUsahaDashboard';
import { DashboardTopBar } from '../layout/DashboardTopBar';
import { PeopleRepository } from '@/domains/people/peopleRepository';

interface OwnerDashboardProps {
  businessId?: string;
  branchId?: string;
  actorUserId?: string;
  isDemo?: boolean;
  onRoleChange?: (role: 'OWNER' | 'KEPALA_CABANG' | 'PEGAWAI') => void;
  onLogout?: () => void;
}

export function OwnerDashboard({
  businessId = 'tenant-001',
  branchId = 'branch-001',
  actorUserId = 'user-owner-01',
  isDemo = false,
  onRoleChange,
  onLogout,
}: OwnerDashboardProps) {
  const [activeSidebarMenu, setActiveSidebarMenu] = useState<string>('EXECUTIVE_OVERVIEW');
  const [masterDataSubTab, setMasterDataSubTab] = useState<'PEGAWAI' | 'CATALOG'>('PEGAWAI');
  const [activeRole] = useState<'OWNER' | 'KEPALA_CABANG' | 'PEGAWAI'>('OWNER');

  useEffect(() => {
    if (isDemo && !['EXECUTIVE_OVERVIEW', 'ANALISIS_INTELIGENSI'].includes(activeSidebarMenu)) {
      setActiveSidebarMenu('EXECUTIVE_OVERVIEW');
    }
  }, [isDemo, activeSidebarMenu]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-[#F26522] selection:text-white transition-colors duration-200">
      {/* Clean Top Bar Header (Locked Target Final) */}
      <DashboardTopBar role="OWNER" onLogout={onLogout} />

      {/* Main Body Grid Layout: Left Sidebar + Right Dashboard */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR NAVIGATION — SOURCE OF TRUTH FROM REFERENCE IMAGE */}
        <aside className="w-64 bg-slate-900 dark:bg-[#0B172A] text-slate-200 dark:text-slate-300 flex flex-col justify-between p-4 border-r border-slate-800 shrink-0 hidden lg:flex">
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center space-x-3 px-2 pt-2">
              <img
                src="/logo.png"
                alt="PILIN ERP"
                className="h-9 w-auto object-contain rounded shrink-0 bg-white/10 p-0.5"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F26522] to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                P
              </div>
              <div>
                <div className="font-black text-white text-base tracking-wider leading-none">PILIN</div>
                <div className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">Business Operating System</div>
              </div>
            </div>

            {/* Active Owner Badge */}
            <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide">
                {isDemo ? 'OWNER DEMO PREVIEW' : 'DASHBOARD OWNER'}
              </span>
              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                isDemo ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
              }`}>
                {isDemo ? 'PREVIEW DEMO' : 'AKTIF'}
              </span>
            </div>

            {/* Sidebar Menu Items */}
            <nav className="space-y-1">
              {[
                { id: 'EXECUTIVE_OVERVIEW', label: 'Executive Overview', icon: LayoutDashboardIcon },
                { id: 'PERFORMA_CABANG', label: 'Performa Cabang', icon: BuildingIcon },
                { id: 'MANAJEMEN_PEGAWAI', label: 'Manajemen Pegawai Organisasi', icon: UsersIcon },
                { id: 'MASTER_DATA', label: 'Input Master Data (Pegawai, Layanan & BOM)', icon: DatabaseIcon },
                { id: 'FINANCE_REPORT', label: 'Laporan Rugi Laba & Keuangan', icon: DollarIcon },
                { id: 'PROMOSI_OTOMATIS', label: 'Promosi Otomatis', icon: SparklesIcon },
                { id: 'OTORISASI_CONTROL', label: 'Otorisasi & Control', icon: ShieldIcon },
                { id: 'ANALISIS_INTELIGENSI', label: 'Analisis Inteligensi', icon: BarChartIcon },
                { id: 'IDENTITAS_USAHA', label: 'Identitas Usaha & Nota', icon: StoreIcon },
                { id: 'SYSTEM_IMPORT', label: 'System & Import', icon: UploadIcon },
              ]
                .filter((item) => !isDemo || ['EXECUTIVE_OVERVIEW', 'ANALISIS_INTELIGENSI'].includes(item.id))
                .map((item) => {
                const IconComponent = item.icon;
                const isActive = activeSidebarMenu === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSidebarMenu(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-md font-bold'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Widgets */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-2 text-white font-bold text-xs">
                <CrownIcon className="w-4 h-4 text-amber-400" />
                <span>PILIN (Multi-Branch)</span>
              </div>
            </div>

            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#F26522]" />
              <span>Butuh bantuan? Hubungi tim support →</span>
            </button>
          </div>
        </aside>

        {/* RIGHT DASHBOARD CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {isDemo && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-amber-500 dark:text-amber-400 text-xs font-bold shadow-sm">
              <span>👁️ DEMO PREVIEW OWNER ERP — Mode Simulasi Tampilan Website (Terbatas pada Executive Overview & Analisis Inteligensi)</span>
              <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 uppercase tracking-wider font-extrabold">Demo Only</span>
            </div>
          )}

          {/* MENU 1: EXECUTIVE OVERVIEW */}
          {activeSidebarMenu === 'EXECUTIVE_OVERVIEW' && (
            <div className="space-y-6">
              {/* Executive Overview Header Title */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold mb-0.5">
                    Selamat datang,
                  </div>
                  <h1 className="text-2xl font-black text-[#0F2547] dark:text-white tracking-tight">
                    Owner Dashboard
                  </h1>
                </div>

                {/* Date & Time Real-Time Card */}
                <div className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 text-xs transition-colors">
                  <Calendar className="w-4.5 h-4.5 text-[#F26522]" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Jumat, 15 Agustus 2026</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Real-Time Data • 13:24 WIB</div>
                  </div>
                </div>
              </div>

              {/* SECTION I: 4 TOP EXECUTIVE SUMMARY METRIC CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total Pendapatan Omzet */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black text-lg">
                      $
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      12.5%
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Pendapatan Omzet</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">Rp 285.420.000</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Dari seluruh cabang</div>
                  </div>
                  <div className="h-8 w-full pt-1">
                    <svg className="w-full h-full text-emerald-500" viewBox="0 0 100 30" fill="none">
                      <path d="M0 25 L20 20 L40 22 L60 12 L80 15 L100 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Card 2: Total Pengeluaran (OPEX) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-100/70 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-lg">
                      🛒
                    </div>
                    <span className="bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      8.3%
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Pengeluaran (OPEX)</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">Rp 182.750.000</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Dari seluruh cabang</div>
                  </div>
                  <div className="h-8 w-full pt-1">
                    <svg className="w-full h-full text-rose-500" viewBox="0 0 100 30" fill="none">
                      <path d="M0 20 L20 18 L40 25 L60 15 L80 12 L100 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Card 3: Biaya Gaji Pegawai (Labor Cost) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                      👥
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      4.2%
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Biaya Gaji Pegawai (Labor Cost)</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">- Rp 75.000.000</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Dari seluruh cabang</div>
                  </div>
                  <div className="h-8 w-full pt-1">
                    <svg className="w-full h-full text-blue-500" viewBox="0 0 100 30" fill="none">
                      <path d="M0 10 L20 15 L40 12 L60 20 L80 18 L100 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Card 4: Laba Bersih (Konsolidasi) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-100/70 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                      📊
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      28.6%
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Laba Bersih (Konsolidasi)</div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">Rp 27.670.000</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">Margin Laba Bersih: <span className="text-blue-600 dark:text-blue-400 font-bold">9.7%</span></div>
                  </div>
                  <div className="h-8 w-full pt-1">
                    <svg className="w-full h-full text-purple-500" viewBox="0 0 100 30" fill="none">
                      <path d="M0 25 L25 20 L50 24 L75 10 L100 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* SECTION II: BREAKDOWN KEUANGAN & OMZET PER CABANG (MULTI-BRANCH PERFORMANCE) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      🏢
                    </div>
                    <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
                      II. Breakdown Keuangan & Omzet Per Cabang (Multi-Branch Performance)
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-bold">
                      3 Site Active Branches
                    </span>
                    <button className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center space-x-1">
                      <span>Lihat Detail</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3 Active Branches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Branch 1: Jakarta */}
                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                          SITE #01
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">Cabang Utama (Jakarta)</h3>
                        <p className="text-[11px] text-slate-500">Jl. Samanhudi No. 12, Jakarta Pusat</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pendapatan Omzet:</span>
                        <span className="font-bold text-emerald-600">Rp 125.430.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pengeluaran Operasional (OPEX):</span>
                        <span className="font-bold text-rose-600">- Rp 78.250.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Biaya Gaji Pegawai (Labor Cost):</span>
                        <span className="font-bold text-purple-600">- Rp 30.000.000</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">Laba Bersih Cabang:</div>
                        <div className="text-[11px] text-slate-500">Margin Laba Bersih: <span className="text-blue-600 font-bold">13.7%</span></div>
                      </div>
                      <div className="text-lg font-black text-slate-900">Rp 17.180.000</div>
                    </div>
                  </div>

                  {/* Branch 2: Bandung */}
                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                          SITE #02
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">Cabang Bandung</h3>
                        <p className="text-[11px] text-slate-500">Jl. Asia Afrika No. 88, Bandung</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pendapatan Omzet:</span>
                        <span className="font-bold text-emerald-600">Rp 89.750.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pengeluaran Operasional (OPEX):</span>
                        <span className="font-bold text-rose-600">- Rp 58.500.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Biaya Gaji Pegawai (Labor Cost):</span>
                        <span className="font-bold text-purple-600">- Rp 25.000.000</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">Laba Bersih Cabang:</div>
                        <div className="text-[11px] text-slate-500">Margin Laba Bersih: <span className="text-blue-600 font-bold">7.0%</span></div>
                      </div>
                      <div className="text-lg font-black text-slate-900">Rp 6.250.000</div>
                    </div>
                  </div>

                  {/* Branch 3: Bogor */}
                  <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                          SITE #03
                        </span>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">Cabang Bogor</h3>
                        <p className="text-[11px] text-slate-500">Jl. Pajajaran No. 45, Bogor</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Aktif
                      </span>
                    </div>

                    <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pendapatan Omzet:</span>
                        <span className="font-bold text-emerald-600">Rp 70.240.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Pengeluaran Operasional (OPEX):</span>
                        <span className="font-bold text-rose-600">- Rp 46.000.000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Biaya Gaji Pegawai (Labor Cost):</span>
                        <span className="font-bold text-purple-600">- Rp 20.000.000</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
                      <div>
                        <div className="text-[11px] font-bold text-slate-900">Laba Bersih Cabang:</div>
                        <div className="text-[11px] text-slate-500">Margin Laba Bersih: <span className="text-blue-600 font-bold">6.0%</span></div>
                      </div>
                      <div className="text-lg font-black text-slate-900">Rp 4.240.000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION III & IV GRID: LAPORAN ARUS KAS & OTORISASI VERIFIKASI */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Section III: Laporan Arus Kas Operasional (3 Cols) */}
                <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-600 font-bold">$</span>
                      <h2 className="text-base font-extrabold text-[#0F2547]">
                        III. Laporan Arus Kas Operasional (Cash Flow Statement)
                      </h2>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      NET CASH POSITIVE
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Operating Cash Inflows */}
                    <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">+</span>
                          <span>Arus Kas Masuk Operasional (Operating Cash Inflows)</span>
                        </div>
                        <span className="text-base font-black text-emerald-700">+ Rp 292.150.000</span>
                      </div>
                      <div className="text-[11px] text-slate-600 pl-7">
                        Setoran Kasir POS Transaksi Lunas (Cash + Transfer)
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] pl-7">
                        <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200 text-emerald-800 font-semibold">
                          Tunai / Physical Cash (Laci Kasir): <strong className="text-slate-900">Rp 98.420.000</strong>
                        </span>
                        <span className="bg-white px-3 py-1 rounded-lg border border-emerald-200 text-emerald-800 font-semibold">
                          Nontunai / Bank Transfer & QRIS: <strong className="text-slate-900">Rp 193.730.000</strong>
                        </span>
                      </div>
                    </div>

                    {/* Operating Cash Outflows */}
                    <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-rose-900">
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">-</span>
                          <span>Arus Kas Keluar Operasional (Operating Cash Outflows)</span>
                        </div>
                        <span className="text-base font-black text-rose-700">- Rp 182.750.000</span>
                      </div>
                      <p className="text-[11px] text-rose-800 pl-7">
                        Biaya Bahan Baku, Listrik, Operasional & Maintenance Cabang
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section IV: Otorisasi & Verifikasi Laporan Keuangan (2 Cols) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <h2 className="text-base font-extrabold text-[#0F2547]">
                          IV. Otorisasi & Verifikasi Laporan Keuangan
                        </h2>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        EXECUTIVE AUDIT
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mt-3">
                      Laporan Keuangan Konsolidasi Perusahaan dibuat secara otomatis berdasarkan akumulasi transaksi POS resmi dan pengeluaran operasional terverifikasi.
                    </p>
                  </div>

                  {/* Audit Trail Box */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Audit Trail Verification:</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono space-y-0.5 pl-6">
                      <div>Timestamp Audit: <strong>2026-08-15 11:10</strong></div>
                      <div>Verifier Authority: <strong className="text-slate-900">OWNER EXECUTIVE ITER 3</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 EXECUTIVE CHARTS GRID (TREN OMZET, OPEX, KINERJA CABANG) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Chart 1: Tren Omzet & Laba Bersih */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-extrabold text-xs text-[#0F2547]">
                      Tren Omzet & Laba Bersih (Seluruh Cabang)
                    </h3>
                    <div className="flex items-center space-x-3 text-[10px] font-bold">
                      <span className="flex items-center gap-1 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Omzet</span>
                      <span className="flex items-center gap-1 text-blue-600"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Laba Bersih</span>
                    </div>
                  </div>

                  <div className="h-44 w-full relative flex items-end pt-4">
                    <svg className="w-full h-full" viewBox="0 0 300 120" fill="none">
                      <line x1="0" y1="30" x2="300" y2="30" stroke="#F1F5F9" strokeDasharray="3 3" />
                      <line x1="0" y1="70" x2="300" y2="70" stroke="#F1F5F9" strokeDasharray="3 3" />

                      {/* Omzet Line (Green) */}
                      <path d="M10 90 L50 82 L90 78 L130 60 L170 68 L210 75 L250 62 L290 55" stroke="#10B981" strokeWidth="3" strokeLinecap="round" />

                      {/* Laba Line (Blue) */}
                      <path d="M10 110 L50 105 L90 100 L130 92 L170 95 L210 98 L250 90 L290 85" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />

                      <circle cx="290" cy="55" r="4" fill="#10B981" />
                      <circle cx="290" cy="85" r="4" fill="#2563EB" />
                    </svg>

                    <div className="absolute top-2 right-4 bg-slate-900 text-white p-2 rounded-lg text-[10px] font-mono shadow-md border border-slate-700">
                      <div className="text-amber-400 font-bold">Agu 2026</div>
                      <div className="text-emerald-400">Omzet: Rp 125.430.000</div>
                      <div className="text-blue-400">Laba Bersih: Rp 17.180.000</div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>Mei</span><span>Jun</span><span>Jul</span><span>Agu</span>
                  </div>
                </div>

                {/* Chart 2: Komposisi Pengeluaran (OPEX) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-xs text-[#0F2547] border-b border-slate-100 pb-2">
                    Komposisi Pengeluaran (OPEX)
                  </h3>

                  <div className="flex items-center justify-between gap-4">
                    <div className="relative w-28 h-28 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#2563EB" strokeWidth="4" strokeDasharray="38.5, 100" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#38BDF8" strokeWidth="4" strokeDasharray="15.2, 100" strokeDashoffset="-38.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="20.1, 100" strokeDashoffset="-53.7" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#F43F5E" strokeWidth="4" strokeDasharray="13.4, 100" strokeDashoffset="-73.8" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[9px] text-slate-400 font-medium">Rp</span>
                        <span className="text-[10px] font-black text-slate-900 leading-tight">182.75M</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-700 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>Bahan Baku</span>
                        <span className="font-bold text-slate-900">38.5%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>Listrik & Utilitas</span>
                        <span className="font-bold text-slate-900">15.2%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>Maintenance</span>
                        <span className="font-bold text-slate-900">12.8%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Sewa</span>
                        <span className="font-bold text-slate-900">20.1%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>Operasional Lainnya</span>
                        <span className="font-bold text-slate-900">13.4%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 3: Kinerja Cabang (Laba Bersih) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-xs text-[#0F2547] border-b border-slate-100 pb-2">
                    Kinerja Cabang (Laba Bersih)
                  </h3>

                  <div className="space-y-3 text-xs pt-1">
                    {/* Jakarta */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-800">Jakarta</span>
                        <span className="font-bold text-emerald-600">Rp 17.180.000</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[85%]"></div>
                      </div>
                    </div>

                    {/* Bandung */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-800">Bandung</span>
                        <span className="font-bold text-blue-600">Rp 6.250.000</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full w-[50%]"></div>
                      </div>
                    </div>

                    {/* Bogor */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-800">Bogor</span>
                        <span className="font-bold text-purple-600">Rp 4.240.000</span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full w-[35%]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OTHER SIDEBAR MENU VIEWS */}
          {activeSidebarMenu === 'MANAJEMEN_PEGAWAI' && (
            <PeopleManagementDashboard
              businessId={businessId}
              actorUserId={actorUserId}
              actorRole={activeRole}
              initialTab="DIVISION"
            />
          )}

          {activeSidebarMenu === 'MASTER_DATA' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-[#0F2547] tracking-tight">
                    Input Master Data Perusahaan
                  </h2>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setMasterDataSubTab('PEGAWAI')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      masterDataSubTab === 'PEGAWAI'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    👤 Input Master Data Pegawai
                  </button>
                  <button
                    onClick={() => setMasterDataSubTab('CATALOG')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      masterDataSubTab === 'CATALOG'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🏷️ Input Master Layanan & BOM
                  </button>
                </div>
              </div>

              {masterDataSubTab === 'PEGAWAI' ? (
                <PeopleManagementDashboard
                  businessId={businessId}
                  actorUserId={actorUserId}
                  actorRole={activeRole}
                  initialTab="EMPLOYEE"
                />
              ) : (
                <ProductMasterDashboard />
              )}
            </div>
          )}

          {activeSidebarMenu === 'FINANCE_REPORT' && (
            <FinanceHppDashboard />
          )}

          {activeSidebarMenu === 'OTORISASI_CONTROL' && (
            <LaporanOtorisasiControl />
          )}

          {activeSidebarMenu === 'SYSTEM_IMPORT' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  ⚙️
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F2547]">System & Import Master Data</h2>
                </div>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                <button className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold shadow-sm">
                  + Impor File Excel / CSV Master
                </button>
              </div>
            </div>
          )}

          {activeSidebarMenu === 'PROMOSI_OTOMATIS' && (
            <LaporanPromosiOtomatis />
          )}

          {activeSidebarMenu === 'ANALISIS_INTELIGENSI' && (
            <AnalisisInteligensiBisnis />
          )}

          {activeSidebarMenu === 'IDENTITAS_USAHA' && (
            <IdentitasUsahaDashboard businessId={businessId} />
          )}

          {(activeSidebarMenu === 'PERFORMA_CABANG' || activeSidebarMenu === 'DATABASE_PELANGGAN') && (
            <OwnerPerformaCabangView businessId={businessId} actorUserId={actorUserId} />
          )}
        </main>
      </div>
    </div>
  );
}

// Performa Cabang View with Branch Selector for Owner
function OwnerPerformaCabangView({
  businessId,
  actorUserId,
}: {
  businessId: string;
  actorUserId: string;
}) {
  const [branches, setBranches] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('branch-001');

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await PeopleRepository.listBranches(businessId);
        if (data && data.length > 0) {
          setBranches(data);
          setSelectedBranchId(data[0].id);
        } else {
          setBranches([
            { id: 'branch-001', name: 'Cabang Utama (Jakarta)', code: 'BR-001' },
            { id: 'branch-002', name: 'Cabang Bandung', code: 'BR-002' },
            { id: 'branch-003', name: 'Cabang Surabaya', code: 'BR-003' },
          ]);
        }
      } catch (err) {
        console.error('Failed to load branches for selector', err);
        setBranches([
          { id: 'branch-001', name: 'Cabang Utama (Jakarta)', code: 'BR-001' },
          { id: 'branch-002', name: 'Cabang Bandung', code: 'BR-002' },
          { id: 'branch-003', name: 'Cabang Surabaya', code: 'BR-003' },
        ]);
      }
    }
    loadBranches();
  }, [businessId]);

  return (
    <div className="space-y-4">
      {/* Top Branch Selector Bar for Owner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F26522] to-amber-500 flex items-center justify-center text-white font-black shadow-md shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-[#0F2547] dark:text-white leading-none">
              Performa Cabang (Pusat Kendali Operasional)
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
          <Filter className="w-4 h-4 text-[#F26522]" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilih Cabang:</span>
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 font-bold text-slate-900 dark:text-white text-xs focus:outline-none focus:border-[#F26522] shadow-sm cursor-pointer min-w-[220px]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                🏢 {b.name} ({b.code || b.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard Kepala Cabang (ManagementControlDashboard) for Selected Branch */}
      <ManagementControlDashboard
        key={selectedBranchId}
        businessId={businessId}
        branchId={selectedBranchId}
        actorUserId={actorUserId}
        actorRole="OWNER"
      />
    </div>
  );
}

// Icon Helper Components
function LayoutDashboardIcon(props: any) { return <BarChart3 {...props} />; }
function BuildingIcon(props: any) { return <Building2 {...props} />; }
function UsersIcon(props: any) { return <Users {...props} />; }
function DatabaseIcon(props: any) { return <Database {...props} />; }
function ContactIcon(props: any) { return <Users {...props} />; }
function DollarIcon(props: any) { return <DollarSign {...props} />; }
function SparklesIcon(props: any) { return <Sparkles {...props} />; }
function ShieldIcon(props: any) { return <Shield {...props} />; }
function BarChartIcon(props: any) { return <BarChart3 {...props} />; }
function StoreIcon(props: any) { return <Building2 {...props} />; }
function UploadIcon(props: any) { return <Upload {...props} />; }
function CrownIcon(props: any) { return <Crown {...props} />; }
function Crown(props: any) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={props.className}>
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    </svg>
  );
}
