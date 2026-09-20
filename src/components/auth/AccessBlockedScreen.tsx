'use client';

import React from 'react';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface AccessBlockedScreenProps {
  roleName: string;
  onBackToLogin: () => void;
}

export function AccessBlockedScreen({ roleName, onBackToLogin }: AccessBlockedScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 font-sans relative selection:bg-[#F26522] selection:text-white">
      {/* Top Controls */}
      <div className="flex justify-end items-center max-w-md w-full mx-auto">
        <ThemeToggle showLabel className="px-3 py-1.5 text-xs bg-slate-900 text-slate-200 border border-slate-800" />
      </div>

      {/* Main Blocked Card */}
      <div className="max-w-md w-full mx-auto bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 my-auto text-center backdrop-blur-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-3">
          <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
            Akses Belum Tersedia
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Akun {roleName} Belum Didaftarkan
          </h1>
          <div className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            Akun <span className="text-slate-200 font-bold">{roleName}</span> belum didaftarkan oleh Owner usaha Anda. Silakan hubungi Owner untuk mendaftarkan akun pegawai Anda terlebih dahulu melalui menu <span className="text-slate-200 font-bold">Manajemen Pegawai</span>.
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToLogin}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Login</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-600 font-mono">
        PILIN ERP v2.4 — Business Operating System
      </div>
    </div>
  );
}
