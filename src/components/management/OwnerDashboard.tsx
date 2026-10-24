'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  CheckCircle2, ArrowUpRight, Shield, Calendar, 
  HelpCircle, BarChart3, Database, Sparkles, Upload, Building2, Filter, Activity
} from 'lucide-react';
import { ManagementControlDashboard } from './ManagementControlDashboard';
import { PeopleManagementDashboard } from '../people/PeopleManagementDashboard';
import { FinanceHppDashboard } from '../finance/FinanceHppDashboard';
import { ProductMasterDashboard } from '../catalog/ProductMasterDashboard';
import { LaporanPromosiOtomatis } from '../promotion/LaporanPromosiOtomatis';
import { LaporanOtorisasiControl } from '../control/LaporanOtorisasiControl';
import { AnalisisInteligensiBisnis } from '../intelligence/AnalisisInteligensiBisnis';
import { IdentitasUsahaDashboard } from './IdentitasUsahaDashboard';
import { DashboardTopBar, DashboardRole } from '../layout/DashboardTopBar';
import { PeopleRepository, BranchItem } from '@/domains/people/peopleRepository';
import { TenantService } from '@/domains/tenant/tenantService';
import { TenantOnboardingModal } from '../tenant/TenantOnboardingModal';
import { Employee } from '@/domains/people/people.types';

interface OwnerDashboardProps {
  businessId?: string;
  branchId?: string;
  actorUserId?: string;
  isDemo?: boolean;
  onRoleChange?: (role: DashboardRole) => void;
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

  const [isOnboarded, setIsOnboarded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return isDemo ? true : TenantService.isOnboarded();
  });
  const [trialInfo, setTrialInfo] = useState<{ isActive: boolean; daysRemaining: number; endDateFormatted: string; businessName: string } | null>(null);

  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!isDemo) {
      const onboarded = TenantService.isOnboarded();
      setIsOnboarded(onboarded);
      setTrialInfo(TenantService.getTrialInfo());
    }
  }, [isDemo]);

  useEffect(() => {
    PeopleRepository.listBranches(businessId, isDemo).then(setBranches);
    PeopleRepository.listEmployees(businessId).then(setEmployees);
  }, [businessId, isDemo]);

  if (!isDemo && !isOnboarded) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-[#F26522] selection:text-white transition-colors duration-200">
        <DashboardTopBar role="OWNER" onLogout={onLogout} onRoleChange={onRoleChange} isDemo={isDemo} businessId={businessId} />
        <div className="flex-1 flex items-center justify-center p-4">
          <TenantOnboardingModal
            onSuccess={() => {
              setIsOnboarded(true);
              setTrialInfo(TenantService.getTrialInfo());
            }}
          />
        </div>
      </div>
    );
  }

  const currentDateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col selection:bg-[#F26522] selection:text-white transition-colors duration-200">
      {/* Top Bar Header */}
      <DashboardTopBar role="OWNER" onLogout={onLogout} onRoleChange={onRoleChange} isDemo={isDemo} businessId={businessId} />

      {/* Main Body Grid Layout: Left Sidebar + Right Dashboard */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-slate-900 dark:bg-[#0B172A] text-slate-200 dark:text-slate-300 flex flex-col justify-between p-4 border-r border-slate-800 shrink-0 hidden lg:flex">
          <div className="space-y-6">
            {/* Official Logo */}
            <div className="flex items-center space-x-3 px-2 pt-2">
              <img
                src="/logo.png"
                alt="PILIN ERP"
                className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0 shadow-md"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div>
                <div className="font-black text-white text-base tracking-wider leading-none">PILIN ERP</div>
              </div>
            </div>

            {/* Active Owner Badge */}
            <div className="bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide">
                DASHBOARD OWNER
              </span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                AKTIF
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
              ].map((item) => {
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
                <span>PILIN Enterprise ERP</span>
              </div>
            </div>

            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
              <HelpCircle className="w-3.5 h-3.5 text-[#F26522]" />
              <span>Bantuan & Panduan Sistem</span>
            </button>
          </div>
        </aside>

        {/* RIGHT DASHBOARD CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {!isDemo && !isOnboarded && (
            <TenantOnboardingModal
              onSuccess={() => {
                setIsOnboarded(true);
                setTrialInfo(TenantService.getTrialInfo());
              }}
            />
          )}

          {!isDemo && isOnboarded && trialInfo && (
            <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-sm">
                  ✨
                </div>
                <div>
                  <div className="font-extrabold text-white text-sm">
                    Masa Uji Coba (Trial 14 Hari) — {trialInfo.businessName}
                  </div>
                  <div className="text-[11px] text-slate-300 font-mono mt-0.5">
                    Status: Aktif • Berakhir pada {trialInfo.endDateFormatted} ({trialInfo.daysRemaining} hari tersisa)
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg uppercase tracking-wide">
                  TRIAL 14 HARI
                </span>
              </div>
            </div>
          )}

          {/* MENU 1: EXECUTIVE OVERVIEW */}
          {activeSidebarMenu === 'EXECUTIVE_OVERVIEW' && (
            <div className="space-y-6">
              {/* Executive Overview Header Title */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-[#0F2547] dark:text-white tracking-tight">
                    Owner Dashboard
                  </h1>
                </div>

                {/* Date & Time Real-Time Card */}
                <div className="bg-white dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3 text-xs transition-colors">
                  <Calendar className="w-4.5 h-4.5 text-[#F26522]" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{currentDateFormatted}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Live Cloud Sync • Real-Time</div>
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
                      Live Active
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Total Pendapatan Omzet
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Rp 0
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Siap mencatat transaksi POS
                    </div>
                  </div>
                  <div className="h-4 w-full"></div>
                </div>

                {/* Card 2: Total Pengeluaran (OPEX) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-rose-100/70 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-lg">
                      🛒
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      0% OPEX Ratio
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Total Pengeluaran (OPEX)
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Rp 0
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Belum ada pengeluaran dicatat
                    </div>
                  </div>
                  <div className="h-4 w-full"></div>
                </div>

                {/* Card 3: Biaya Gaji Pegawai (Labor Cost) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/70 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-lg">
                      👥
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {employees.length > 0 ? `${employees.length} Pegawai Terdaftar` : '1 Kasir Aktif'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Biaya Gaji (Labor Cost)
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Rp 0
                    </div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Struktur penggajian siap dikonfigurasi
                    </div>
                  </div>
                  <div className="h-4 w-full"></div>
                </div>

                {/* Card 4: Laba Bersih (Konsolidasi) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 relative overflow-hidden transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-purple-100/70 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-lg">
                      📊
                    </div>
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      0.0% Margin
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Laba Bersih Konsolidasi
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                      Rp 0
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                      Margin Laba Bersih: <span className="text-blue-600 dark:text-blue-400 font-bold">0.0%</span>
                    </div>
                  </div>
                  <div className="h-4 w-full"></div>
                </div>
              </div>

              {/* SECTION II: BREAKDOWN KEUANGAN & OMZET PER CABANG */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      🏢
                    </div>
                    <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
                      II. Status Cabang & Kinerja Operasional
                    </h2>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1 rounded-full font-bold">
                      {branches.length > 0 ? `${branches.length} Cabang Terdaftar` : '1 Cabang Utama'}
                    </span>
                    <button
                      onClick={() => setActiveSidebarMenu('PERFORMA_CABANG')}
                      className="px-4 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Kendali Cabang</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Branches Grid */}
                {branches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {branches.map((b, idx) => (
                      <div key={b.id} className="bg-slate-50/80 dark:bg-slate-800/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                              SITE #{idx + 1}
                            </span>
                            <div className="font-bold text-slate-900 dark:text-white text-sm mt-1">{b.name}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{b.address || 'Bengkel Tas Sepatu, Indonesia'}</div>
                          </div>
                          <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Operasional Aktif
                          </span>
                        </div>

                        <div className="space-y-2 text-xs border-t border-slate-200 dark:border-slate-700 pt-3">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Pendapatan Omzet:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">Rp 0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Pengeluaran (OPEX):</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">Rp 0</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-slate-400">Gaji Pegawai:</span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">Rp 0</span>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-3 flex justify-between items-baseline">
                          <div>
                            <div className="text-[11px] font-bold text-slate-900 dark:text-white">Laba Bersih Cabang:</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Margin: <span className="text-blue-600 dark:text-blue-400 font-bold">0.0%</span></div>
                          </div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">Rp 0</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50/80 dark:bg-slate-800/60 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
                    <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                      🏢
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Belum Ada Data Cabang
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveSidebarMenu('MASTER_DATA')}
                      className="px-5 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold rounded-xl text-xs transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>Mulai Input Master Data →</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION III & IV GRID: LAPORAN ARUS KAS & OTORISASI VERIFIKASI */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Section III: Laporan Arus Kas Operasional (3 Cols) */}
                <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-600 font-bold">$</span>
                      <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
                        III. Laporan Arus Kas Operasional (Cash Flow Statement)
                      </h2>
                    </div>
                    <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                      STANDBY LIVE
                    </span>
                  </div>

                  <div className="space-y-3">
                    {/* Operating Cash Inflows */}
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">+</span>
                          <span>Arus Kas Masuk Operasional (Cash Inflows)</span>
                        </div>
                        <span className="text-base font-black text-emerald-700 dark:text-emerald-400">+ Rp 0</span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] pl-7">
                        <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
                          Tunai (Laci Kasir): <strong className="text-slate-900 dark:text-white">Rp 0</strong>
                        </span>
                        <span className="bg-white dark:bg-slate-900 px-3 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-semibold">
                          Nontunai & QRIS: <strong className="text-slate-900 dark:text-white">Rp 0</strong>
                        </span>
                      </div>
                    </div>

                    {/* Operating Cash Outflows */}
                    <div className="bg-rose-50/70 dark:bg-rose-950/30 p-4 rounded-xl border border-rose-200 dark:border-rose-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs font-bold text-rose-900 dark:text-rose-300">
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">-</span>
                          <span>Arus Kas Keluar Operasional (Cash Outflows)</span>
                        </div>
                        <span className="text-base font-black text-rose-700 dark:text-rose-400">- Rp 0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section IV: Otorisasi & Verifikasi Laporan Keuangan (2 Cols) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-4 h-4 text-amber-500" />
                        <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
                          IV. Otorisasi & Verifikasi Sistem
                        </h2>
                      </div>
                      <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                        EXECUTIVE VERIFIED
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Mode Sistem:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Live Tenant Cloud Sync</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Otoritas Pemilik:</span>
                        <span className="font-extrabold text-slate-900 dark:text-white">Owner Bengkel Tas Sepatu</span>
                      </div>
                    </div>
                  </div>

                  {/* Audit Trail Box */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Audit Trail Verification:</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono space-y-0.5 pl-6">
                      <div>Status Sinkronisasi: <strong>Terhubung ke Database Cloud</strong></div>
                      <div>Otoritas: <strong className="text-slate-900 dark:text-white">SUPER ADMIN & OWNER</strong></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* REAL-TIME MONITORING CARD (REPLACES FAKE DUMMY CHARTS) */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-[#F26522]" />
                    <h2 className="text-base font-extrabold text-[#0F2547] dark:text-white">
                      Visualisasi Tren Keuangan Real-Time
                    </h2>
                  </div>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    AUTO ACCUMULATE
                  </span>
                </div>

                <div className="p-8 text-center space-y-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
                    📈
                  </div>
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Grafik tren omzet, pengeluaran OPEX, dan margin laba akan aktif otomatis
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Data grafik diakumulasikan secara langsung setiap kali Kasir memproses transaksi nota atau Kepala Cabang mencatat pengeluaran operasional.
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
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                  <h2 className="text-xl font-black text-[#0F2547] dark:text-white tracking-tight">
                    Input Master Data Perusahaan
                  </h2>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setMasterDataSubTab('PEGAWAI')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      masterDataSubTab === 'PEGAWAI'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    👤 Input Master Data Pegawai
                  </button>
                  <button
                    onClick={() => setMasterDataSubTab('CATALOG')}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      masterDataSubTab === 'CATALOG'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                  ⚙️
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F2547] dark:text-white">System & Import Master Data</h2>
                </div>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
                <button className="px-4 py-2 bg-[#2563EB] text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer">
                  + Impor File Excel / CSV Master
                </button>
              </div>
            </div>
          )}

          {activeSidebarMenu === 'PROMOSI_OTOMATIS' && (
            <LaporanPromosiOtomatis />
          )}

          {activeSidebarMenu === 'ANALISIS_INTELIGENSI' && (
            <AnalisisInteligensiBisnis isDemo={isDemo} />
          )}

          {activeSidebarMenu === 'IDENTITAS_USAHA' && (
            <IdentitasUsahaDashboard businessId={businessId} />
          )}

          {(activeSidebarMenu === 'PERFORMA_CABANG' || activeSidebarMenu === 'DATABASE_PELANGGAN') && (
            <OwnerPerformaCabangView businessId={businessId} actorUserId={actorUserId} isDemo={isDemo} />
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
  isDemo = false,
}: {
  businessId: string;
  actorUserId: string;
  isDemo?: boolean;
}) {
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await PeopleRepository.listBranches(businessId, isDemo);
        if (data && data.length > 0) {
          setBranches(data);
          setSelectedBranchId(data[0].id);
        } else {
          setBranches([]);
          setSelectedBranchId('');
        }
      } catch (err) {
        console.error('Failed to load branches for selector', err);
      }
    }
    loadBranches();
  }, [businessId, isDemo]);

  return (
    <div className="space-y-6">
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
      {selectedBranchId && (
        <ManagementControlDashboard
          key={selectedBranchId}
          businessId={businessId}
          branchId={selectedBranchId}
          actorUserId={actorUserId}
          actorRole="OWNER"
          isDemo={isDemo}
        />
      )}
    </div>
  );
}

// Icon Helper Components
function LayoutDashboardIcon(props: any) { return <BarChart3 {...props} />; }
function BuildingIcon(props: any) { return <Building2 {...props} />; }
function UsersIcon(props: any) { return <Users {...props} />; }
function DatabaseIcon(props: any) { return <Database {...props} />; }
function DollarIcon(props: any) { return <DollarSign {...props} />; }
function SparklesIcon(props: any) { return <Sparkles {...props} />; }
function ShieldIcon(props: any) { return <Shield {...props} />; }
function BarChartIcon(props: any) { return <BarChart3 {...props} />; }
function StoreIcon(props: any) { return <Building2 {...props} />; }
function UploadIcon(props: any) { return <Upload {...props} />; }
function CrownIcon(props: any) {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className={props.className}>
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
    </svg>
  );
}
