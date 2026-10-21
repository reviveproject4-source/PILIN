'use client';

import React, { useState } from 'react';
import { LogOut, Building2, User, Shield, Wrench, Info, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { BusinessProfileService } from '@/domains/business/businessProfileService';

export type DashboardRole = 'KEPALA_CABANG' | 'KASIR' | 'TEAM_PRODUKSI' | 'PEGAWAI' | 'OWNER';

interface DashboardTopBarProps {
  role: DashboardRole | string;
  roleTitle?: string;
  userName?: string;
  scopeText?: string;
  onLogout?: () => void;
  onRoleChange?: (newRole: DashboardRole) => void;
  businessId?: string;
  isDemo?: boolean;
}

const ROLE_META: Record<string, { title: string; color: string; icon: React.ElementType }> = {
  OWNER: {
    title: 'OWNER',
    color: 'bg-purple-600',
    icon: Shield,
  },
  KEPALA_CABANG: {
    title: 'KEPALA CABANG',
    color: 'bg-[#F26522]',
    icon: Building2,
  },
  KASIR: {
    title: 'KASIR',
    color: 'bg-emerald-600',
    icon: User,
  },
  TEAM_PRODUKSI: {
    title: 'TEAM PRODUKSI',
    color: 'bg-amber-600',
    icon: Wrench,
  },
  PEGAWAI: {
    title: 'TEAM PRODUKSI',
    color: 'bg-amber-600',
    icon: Wrench,
  },
};

export function DashboardTopBar({
  role,
  roleTitle,
  userName,
  onLogout,
  onRoleChange,
  businessId = 'tenant-001',
  isDemo = false,
}: DashboardTopBarProps) {
  const [showOutletModal, setShowOutletModal] = useState<boolean>(false);
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  const meta = ROLE_META[role] || {
    title: role.replace('_', ' '),
    color: 'bg-slate-700',
    icon: User,
  };

  const title = roleTitle || meta.title;
  const RoleIcon = meta.icon;
  const profile = BusinessProfileService.getProfile(businessId);

  const handleLogoutClick = async () => {
    if (onLogout) {
      onLogout();
      return;
    }
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      // Fallback
    }
    window.location.href = '/';
  };

  const handleSelectRole = (newRole: DashboardRole) => {
    setShowRoleModal(false);
    if (onRoleChange) {
      onRoleChange(newRole);
    } else if (typeof window !== 'undefined') {
      window.location.href = `/?mode=demo&role=${newRole}&direct=true`;
    }
  };

  return (
    <header className="bg-[#0F2547] text-white px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between shadow-sm w-full shrink-0 select-none font-sans">
      {/* LEFT: [icon/avatar] Sedang Login: ROLE */}
      <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full ${meta.color} flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-sm shrink-0 border border-white/20`}>
          <RoleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">Sedang Login:</span>
            {isDemo ? (
              <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Demo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-1 sm:px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Live
              </span>
            )}
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-wide text-white leading-none mt-0.5 truncate">
            {title} {userName ? `— ${userName}` : ''}
          </span>
        </div>
      </div>

      {/* RIGHT: Switcher, Info Outlet & Log-Out */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        {isDemo && (
          <>
            <button
              type="button"
              onClick={() => setShowRoleModal(true)}
              className="px-2 sm:px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
              title="Ganti Peran Demo"
            >
              <span>Peran Demo ▾</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/?mode=live';
                }
              }}
              className="px-2 sm:px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-600 text-white border border-emerald-500/50 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
              title="Keluar dari Demo & Masuk ke Jalur Tenant Live"
            >
              <span className="hidden md:inline">Jalur Live →</span>
              <span className="md:hidden">Live →</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setShowOutletModal(true)}
          className="px-2.5 sm:px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-sm active:scale-95"
          title="Info Outlet"
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Info Outlet</span>
        </button>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="px-2.5 sm:px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
          title="Log-Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      {/* Clickable Info Outlet Modal */}
      {showOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>Informasi Outlet</span>
              </h3>
              <button onClick={() => setShowOutletModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Nama Outlet / Usaha</div>
                <div className="font-extrabold text-sm text-slate-900 dark:text-white pt-0.5">{profile.business_name || 'PILIN Service Outlet'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Alamat Operasional</div>
                <div className="text-slate-700 dark:text-slate-300 pt-0.5">{profile.business_address || 'Jl. Utama Service No. 12, Jakarta'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Kontak / WhatsApp Outlet</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-mono font-bold pt-0.5">{profile.business_phone || '081234567890'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Status Operasional</div>
                <div className="inline-block px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded text-[10px] font-bold mt-1">
                  ✓ OPERASIONAL AKTIF
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowOutletModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Clickable Peran Demo Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Ganti Peran Demo PILIN</span>
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {[
                { r: 'OWNER' as DashboardRole, label: 'Owner (Executive ERP)', color: 'bg-purple-600', icon: Shield, border: 'hover:border-purple-500' },
                { r: 'KEPALA_CABANG' as DashboardRole, label: 'Kepala Cabang (Operasional)', color: 'bg-[#F26522]', icon: Building2, border: 'hover:border-[#F26522]' },
                { r: 'KASIR' as DashboardRole, label: 'Kasir (Point of Sale)', color: 'bg-emerald-600', icon: User, border: 'hover:border-emerald-500' },
                { r: 'TEAM_PRODUKSI' as DashboardRole, label: 'Tim Produksi (Work Order)', color: 'bg-amber-600', icon: Wrench, border: 'hover:border-amber-500' },
              ].map((item) => {
                const ItemIcon = item.icon;
                const isCurrent = role === item.r || (role === 'PEGAWAI' && item.r === 'TEAM_PRODUKSI');
                return (
                  <button
                    key={item.r}
                    type="button"
                    onClick={() => handleSelectRole(item.r)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/20'
                        : `border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 ${item.border}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center font-bold text-white shrink-0 shadow-sm`}>
                        <ItemIcon className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-800 dark:text-white">
                        {item.label}
                      </span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] font-black text-amber-500 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-md border border-amber-400/40">
                        Aktif
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowRoleModal(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold rounded-xl text-xs cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

