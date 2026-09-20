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
  businessId?: string;
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
  businessId = 'tenant-001',
}: DashboardTopBarProps) {
  const [showOutletModal, setShowOutletModal] = useState<boolean>(false);

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

  return (
    <header className="bg-[#0F2547] text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between shadow-sm w-full shrink-0 select-none font-sans">
      {/* LEFT: [icon/avatar] Sedang Login: ROLE */}
      <div className="flex items-center space-x-3">
        <div className={`w-9 h-9 rounded-full ${meta.color} flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0 border border-white/20`}>
          <RoleIcon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">Sedang Login:</span>
          <span className="font-extrabold text-sm tracking-wide text-white leading-none">
            {title} {userName ? `— ${userName}` : ''}
          </span>
        </div>
      </div>

      {/* RIGHT: Info Outlet & Log-Out */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          type="button"
          onClick={() => setShowOutletModal(true)}
          className="px-3.5 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
        >
          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Info Outlet</span>
        </button>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="px-3.5 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
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
    </header>
  );
}

