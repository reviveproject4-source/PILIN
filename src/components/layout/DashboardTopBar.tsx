'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

export type DashboardRole = 'KEPALA_CABANG' | 'KASIR' | 'TEAM_PRODUKSI' | 'PEGAWAI' | 'OWNER';

interface DashboardTopBarProps {
  role: DashboardRole | string;
  roleTitle?: string;
  userName?: string;
  scopeText?: string;
  onLogout?: () => void;
}

const ROLE_META: Record<string, { badge: string; defaultTitle: string; defaultScope: string; color: string }> = {
  KEPALA_CABANG: {
    badge: 'KC',
    defaultTitle: 'KEPALA CABANG',
    defaultScope: 'Branch Scope',
    color: 'bg-[#F26522]',
  },
  KASIR: {
    badge: 'KS',
    defaultTitle: 'KASIR',
    defaultScope: 'Branch Scope',
    color: 'bg-emerald-600',
  },
  TEAM_PRODUKSI: {
    badge: 'TP',
    defaultTitle: 'TEAM PRODUKSI',
    defaultScope: 'Branch Scope',
    color: 'bg-amber-600',
  },
  PEGAWAI: {
    badge: 'PG',
    defaultTitle: 'PEGAWAI',
    defaultScope: 'Branch Scope',
    color: 'bg-blue-600',
  },
  OWNER: {
    badge: 'OW',
    defaultTitle: 'OWNER',
    defaultScope: 'Tenant Scope',
    color: 'bg-purple-600',
  },
};

export function DashboardTopBar({
  role,
  roleTitle,
  userName,
  scopeText,
  onLogout,
}: DashboardTopBarProps) {
  const meta = ROLE_META[role] || {
    badge: role.substring(0, 2).toUpperCase(),
    defaultTitle: role.replace('_', ' '),
    defaultScope: 'Branch Scope',
    color: 'bg-slate-700',
  };

  const title = roleTitle || meta.defaultTitle;
  const scope = scopeText || meta.defaultScope;

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
    <header className="bg-[#0F2547] dark:bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex items-center justify-between shadow-sm w-full shrink-0 transition-colors">
      {/* LEFT: Identitas Role (Non-interactive) */}
      <div className="flex items-center space-x-3 select-none">
        <img
          src="/logo.png"
          alt="PILIN ERP"
          className="h-8 w-auto object-contain rounded shrink-0 bg-white/10 p-0.5"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center font-black text-xs text-white shadow-sm shrink-0`}>
          {meta.badge}
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm tracking-wide text-white leading-none">PILIN ERP — {title}</span>
            {userName && <span className="text-xs text-slate-300 font-medium">({userName})</span>}
          </div>
          <div className="text-[10px] text-slate-400 font-mono leading-none mt-1">{scope}</div>
        </div>
      </div>

      {/* RIGHT: Action Controls — Theme Toggle & Log-Out */}
      <div className="flex items-center space-x-3">
        <ThemeToggle showLabel className="px-3 py-1.5" />
        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log-Out</span>
        </button>
      </div>
    </header>
  );
}
