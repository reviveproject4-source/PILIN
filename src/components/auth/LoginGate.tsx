'use client';

import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { DashboardRole } from '@/components/layout/DashboardTopBar';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LoginGateProps {
  onLoginSuccess: (role: DashboardRole, username: string) => void;
  defaultRole?: DashboardRole | null;
}

export function LoginGate({ onLoginSuccess, defaultRole }: LoginGateProps) {
  const [selectedRole, setSelectedRole] = useState<DashboardRole>(defaultRole || 'OWNER');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setErrorMessage('Pilih role / jabatan akses terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    const finalUserName = username.trim() || (
      selectedRole === 'OWNER' ? 'Bapak Owner' :
      selectedRole === 'KEPALA_CABANG' ? 'Ahmad Fauzi (KC)' :
      selectedRole === 'KASIR' ? 'Siti Rahma (Kasir)' :
      'Tim Produksi Staf'
    );

    onLoginSuccess(selectedRole, finalUserName);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 font-sans relative selection:bg-[#F26522] selection:text-white">
      {/* Top Controls */}
      <div className="flex justify-end items-center max-w-md w-full mx-auto">
        <ThemeToggle showLabel className="px-3 py-1.5 text-xs bg-slate-800 text-slate-200 border border-slate-700" />
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6 my-auto">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-4">
          <div className="inline-block bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-inner">
            <img
              src="/logo.png"
              alt="PILIN ERP Logo"
              className="h-16 w-auto mx-auto object-contain rounded-xl"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>PILIN ERP</span>
          </h1>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Pilih Role / Jabatan Akses:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'OWNER', label: '👑 OWNER', color: 'border-purple-500/50 bg-purple-950/30 text-purple-300' },
                { role: 'KEPALA_CABANG', label: '🏢 KEPALA CABANG', color: 'border-orange-500/50 bg-orange-950/30 text-orange-300' },
                { role: 'KASIR', label: '💳 KASIR', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' },
                { role: 'TEAM_PRODUKSI', label: '⚙️ TEAM PRODUKSI', color: 'border-amber-500/50 bg-amber-950/30 text-amber-300' },
              ].map(item => (
                <button
                  type="button"
                  key={item.role}
                  onClick={() => setSelectedRole(item.role as DashboardRole)}
                  className={`p-3 rounded-xl border text-xs font-extrabold text-left transition-all cursor-pointer ${
                    selectedRole === item.role
                      ? `${item.color} ring-2 ring-[#F26522] shadow-md`
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Email / ID Pegawai:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Masukkan email / kode pegawai..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              Kata Sandi / PIN Security:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#F26522] hover:bg-[#d95416] text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>MASUK KE ERP DASHBOARD</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-600 font-mono">
        PILIN ERP v2.4 — Business Operating System
      </div>
    </div>
  );
}
