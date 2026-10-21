'use client';

import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { DashboardRole } from '@/components/layout/DashboardTopBar';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LoginGateProps {
  onLoginSuccess: (role: DashboardRole, username: string, isDemo: boolean) => void;
  defaultRole?: DashboardRole | null;
  initialTrack?: 'LIVE' | 'DEMO';
}

export function LoginGate({ onLoginSuccess, defaultRole, initialTrack = 'LIVE' }: LoginGateProps) {
  const [selectedTrack, setSelectedTrack] = useState<'LIVE' | 'DEMO'>(initialTrack);
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
    const isDemo = selectedTrack === 'DEMO';
    const finalUserName = username.trim() || (
      selectedRole === 'OWNER' ? (isDemo ? 'Demo Owner' : 'Owner') :
      selectedRole === 'KEPALA_CABANG' ? (isDemo ? 'Demo Kepala Cabang' : 'Kepala Cabang') :
      selectedRole === 'KASIR' ? (isDemo ? 'Demo Kasir' : 'Kasir') :
      (isDemo ? 'Demo Tim Produksi' : 'Tim Produksi')
    );

    onLoginSuccess(selectedRole, finalUserName, isDemo);
  };

  const handleQuickDemoEnter = (role: DashboardRole = 'OWNER') => {
    setSelectedRole(role);
    const roleName =
      role === 'OWNER' ? 'Demo Owner' :
      role === 'KEPALA_CABANG' ? 'Demo Kepala Cabang' :
      role === 'KASIR' ? 'Demo Kasir' :
      'Demo Tim Produksi';
    onLoginSuccess(role, roleName, true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-6 font-sans relative selection:bg-[#F26522] selection:text-white">
      {/* Top Controls */}
      <div className="flex justify-end items-center max-w-md w-full mx-auto">
        <ThemeToggle showLabel className="px-3 py-1.5 text-xs bg-slate-800 text-slate-200 border border-slate-700" />
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-5 my-auto">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
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

        {/* 2 JALUR SELECTOR */}
        <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => { setSelectedTrack('LIVE'); setErrorMessage(null); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTrack === 'LIVE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white"></span>
            <span>Jalur Tenant Live</span>
          </button>
          <button
            type="button"
            onClick={() => { setSelectedTrack('DEMO'); setErrorMessage(null); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedTrack === 'DEMO'
                ? 'bg-[#F26522] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            <span>Jalur Demo</span>
          </button>
        </div>

        {/* Track Status Badge */}
        {selectedTrack === 'LIVE' ? (
          <div className="px-3 py-2 rounded-xl text-[11px] font-bold bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 text-center flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span>Jalur Operasional Resmi • Bersih Dari Data Dummy</span>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl text-[11px] font-bold bg-amber-950/50 text-amber-300 border border-amber-800/60 text-center flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Jalur Simulasi Sandbox • Dilengkapi Contoh Data Demo</span>
          </div>
        )}

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
                { role: 'OWNER', label: 'OWNER', color: 'border-purple-500/50 bg-purple-950/30 text-purple-300' },
                { role: 'KEPALA_CABANG', label: 'KEPALA CABANG', color: 'border-orange-500/50 bg-orange-950/30 text-orange-300' },
                { role: 'KASIR', label: 'KASIR', color: 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300' },
                { role: 'TEAM_PRODUKSI', label: 'TEAM PRODUKSI', color: 'border-amber-500/50 bg-amber-950/30 text-amber-300' },
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
              {selectedTrack === 'LIVE' ? 'Email / ID Pegawai:' : 'Nama Penguji Demo (Opsional):'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={selectedTrack === 'LIVE' ? 'Masukkan email / kode pegawai resmi...' : 'Contoh: Tamu Demo (Opsional)'}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          {selectedTrack === 'LIVE' && (
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
          )}

          <button
            type="submit"
            className={`w-full py-3 text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2 ${
              selectedTrack === 'LIVE'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                : 'bg-[#F26522] hover:bg-[#d95416] shadow-orange-900/30'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {selectedTrack === 'LIVE' ? 'MASUK KE JALUR TENANT LIVE' : `MASUK KE JALUR DEMO (${selectedRole})`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {selectedTrack === 'DEMO' && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider text-center">
                Akses Cepat Jalur Demo (1-Tap Langsung Masuk)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoEnter('OWNER')}
                  className="p-2.5 bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/40 rounded-xl text-left transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    👑
                  </div>
                  <span className="font-bold text-xs text-purple-200">Owner</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoEnter('KEPALA_CABANG')}
                  className="p-2.5 bg-orange-950/40 hover:bg-orange-900/60 border border-orange-500/40 rounded-xl text-left transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-[#F26522] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    🏢
                  </div>
                  <span className="font-bold text-xs text-orange-200">Kepala Cabang</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoEnter('KASIR')}
                  className="p-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-xl text-left transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    🛒
                  </div>
                  <span className="font-bold text-xs text-emerald-200">Kasir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoEnter('TEAM_PRODUKSI')}
                  className="p-2.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 rounded-xl text-left transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-amber-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    ⚙️
                  </div>
                  <span className="font-bold text-xs text-amber-200">Tim Produksi</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-600 font-mono">
        PILIN ERP v2.4 — 2 Jalur Terisolasi: Live Tenant & Demo Sandbox
      </div>
    </div>
  );
}
