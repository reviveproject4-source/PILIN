'use client';

import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, UserPlus, Building2, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { DashboardRole } from '@/components/layout/DashboardTopBar';
import { submitOwnerOnboardingAction } from '@/app/actions/onboardingActions';

interface LoginGateProps {
  onLoginSuccess: (role: DashboardRole, username: string, isDemo: boolean) => void;
  defaultRole?: DashboardRole | null;
  initialTrack?: 'LIVE' | 'DEMO';
  allowDemoToggle?: boolean;
}

export function LoginGate({
  onLoginSuccess,
  defaultRole,
  allowDemoToggle = false,
}: LoginGateProps) {
  // Navigation State: 'LOGIN' | 'REGISTER' | 'REGISTER_SUCCESS'
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'REGISTER_SUCCESS'>('LOGIN');

  // Login Form States
  const [selectedRole, setSelectedRole] = useState<DashboardRole>(defaultRole || 'OWNER');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Registration Form States
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBranchCount, setRegBranchCount] = useState('1 Cabang');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredSummary, setRegisteredSummary] = useState<{ businessName: string; whatsapp: string } | null>(null);

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setErrorMessage('Pilih role / jabatan akses terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    const finalUserName = username.trim() || (
      selectedRole === 'OWNER' ? 'Owner' :
      selectedRole === 'KEPALA_CABANG' ? 'Kepala Cabang' :
      selectedRole === 'KASIR' ? 'Kasir' :
      'Tim Produksi'
    );

    onLoginSuccess(selectedRole, finalUserName, false);
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regBusinessName.trim()) {
      setErrorMessage('Nama Usaha / Bisnis wajib diisi.');
      return;
    }
    if (!regOwnerName.trim()) {
      setErrorMessage('Nama Pemilik / PIC wajib diisi.');
      return;
    }
    if (!regWhatsapp.trim()) {
      setErrorMessage('Nomor WhatsApp wajib diisi.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Email usaha wajib diisi.');
      return;
    }

    setErrorMessage(null);
    setIsRegistering(true);

    try {
      const res = await submitOwnerOnboardingAction({
        ownerName: regOwnerName.trim(),
        businessName: regBusinessName.trim(),
        contactNumber: regWhatsapp.trim(),
        email: regEmail.trim(),
        employeeCount: regBranchCount,
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Gagal mengirim pendaftaran tenant.');
        setIsRegistering(false);
        return;
      }

      setRegisteredSummary({
        businessName: regBusinessName.trim(),
        whatsapp: regWhatsapp.trim(),
      });
      setIsRegistering(false);
      setActiveTab('REGISTER_SUCCESS');
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi gangguan saat memproses pendaftaran.');
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans relative selection:bg-[#F26522] selection:text-white">
      {/* Top Spacer */}
      <div className="h-4"></div>

      {/* Main Container Card */}
      <div className="max-w-md w-full mx-auto bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl space-y-6 my-auto">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-3">
          <div className="inline-block bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-inner">
            <img
              src="/logo.png"
              alt="PILIN ERP Logo"
              className="h-14 w-auto mx-auto object-contain rounded-xl"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>PILIN ERP</span>
          </h1>
        </div>

        {/* Tab Selector: Masuk vs Daftar */}
        {activeTab !== 'REGISTER_SUCCESS' && (
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveTab('LOGIN'); setErrorMessage(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'LOGIN'
                  ? 'bg-[#F26522] text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('REGISTER'); setErrorMessage(null); }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Tenant Baru</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* TAB 1: MASUK AKUN */}
        {activeTab === 'LOGIN' && (
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
              className="w-full py-3 bg-[#F26522] hover:bg-[#d95416] text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>MASUK KE DASHBOARD ERP</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setActiveTab('REGISTER'); setErrorMessage(null); }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Belum memiliki akun usaha? Daftar Tenant Baru →
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DAFTAR TENANT BARU (WELCOME SCREEN PENDAFTARAN) */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Nama Usaha / Brand Bisnis:
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={regBusinessName}
                  onChange={e => setRegBusinessName(e.target.value)}
                  placeholder="Contoh: Laundry Express Mandiri"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Nama Pemilik / PIC Penanggung Jawab:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={regOwnerName}
                  onChange={e => setRegOwnerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Nomor WhatsApp (Tujuan Notifikasi ACC):
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={regWhatsapp}
                  onChange={e => setRegWhatsapp(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Email Usaha:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  placeholder="Contoh: usaha@domain.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Estimasi Jumlah Cabang:
              </label>
              <select
                value={regBranchCount}
                onChange={e => setRegBranchCount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="1 Cabang">1 Cabang (Outlet Utama)</option>
                <option value="2 - 3 Cabang">2 - 3 Cabang</option>
                <option value="4 - 10 Cabang">4 - 10 Cabang</option>
                <option value="> 10 Cabang">Lebih dari 10 Cabang</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer mt-3"
            >
              {isRegistering ? (
                <span>Memproses Pendaftaran...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>KIRIM PENDAFTARAN TENANT</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setActiveTab('LOGIN'); setErrorMessage(null); }}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Sudah memiliki akun terdaftar? Masuk ke Portal →
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: REGISTRATION SUCCESS SCREEN */}
        {activeTab === 'REGISTER_SUCCESS' && (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-white">
                Pendaftaran Berhasil Dikirim
              </h2>
              <div className="text-xs text-slate-300 font-medium leading-relaxed px-2">
                Data usaha <span className="text-white font-bold">{registeredSummary?.businessName}</span> telah diterima. Tim Super Admin akan segera meninjau dan mengaktifkan akun Anda.
              </div>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Tujuan Notifikasi:</span>
                <span className="text-emerald-400 font-bold">{registeredSummary?.whatsapp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Status Pendaftaran:</span>
                <span className="text-amber-400 font-bold">Menunggu ACC Super Admin</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMessage(null);
                setRegBusinessName('');
                setRegOwnerName('');
                setRegWhatsapp('');
                setRegEmail('');
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-slate-500 font-medium">
        PILIN ERP — Sistem Operasional &amp; Manajemen Cabang Terintegrasi
      </div>
    </div>
  );
}
