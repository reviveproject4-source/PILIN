'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Building2,
  Phone,
  Mail,
  CheckCircle2,
  KeyRound,
  MessageSquare,
  RotateCcw,
} from 'lucide-react';
import { DashboardRole } from '@/components/layout/DashboardTopBar';
import { submitOwnerOnboardingAction } from '@/app/actions/onboardingActions';
import {
  requestPasswordResetOtpAction,
  verifyOtpAndSetPasswordAction,
  verifyTenantLoginAction,
} from '@/app/actions/authActions';
import { TenantService } from '@/domains/tenant/tenantService';

interface LoginGateProps {
  onLoginSuccess: (role: DashboardRole, username: string, isDemo: boolean) => void;
  defaultRole?: DashboardRole | null;
  initialTrack?: 'LIVE' | 'DEMO';
  allowDemoToggle?: boolean;
}

export function LoginGate({
  onLoginSuccess,
  defaultRole,
}: LoginGateProps) {
  // Navigation State: 'LOGIN' | 'REGISTER' | 'REGISTER_SUCCESS' | 'RESET_PASSWORD'
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER' | 'REGISTER_SUCCESS' | 'RESET_PASSWORD'>('LOGIN');

  // Login Form States
  const [selectedRole, setSelectedRole] = useState<DashboardRole>(defaultRole || 'OWNER');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Registration Form States
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBranchCount, setRegBranchCount] = useState('1 Cabang');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registeredSummary, setRegisteredSummary] = useState<{ businessName: string; whatsapp: string } | null>(null);

  // Reset Password & OTP States
  const [resetStep, setResetStep] = useState<'REQUEST_OTP' | 'VERIFY_OTP' | 'RESET_SUCCESS'>('REQUEST_OTP');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [otpInfo, setOtpInfo] = useState<{ phone?: string; waUrl?: string; otpPreview?: string; businessName?: string } | null>(null);

  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      setErrorMessage('Pilih role / jabatan akses terlebih dahulu.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoginLoading(true);

    if (username.trim()) {
      try {
        const verifyRes = await verifyTenantLoginAction(selectedRole, username.trim(), password.trim());
        if (!verifyRes.success) {
          setErrorMessage(verifyRes.message || 'Kredensial tidak valid.');
          setLoginLoading(false);
          return;
        }
        if (verifyRes.tenant) {
          TenantService.completeOnboarding({
            businessId: verifyRes.tenant.businessId,
            businessName: verifyRes.tenant.businessName,
            ownerName: verifyRes.tenant.ownerName,
            contactNumber: verifyRes.tenant.whatsapp,
            email: verifyRes.tenant.email,
            employeeCount: verifyRes.tenant.employeeCount || '1 Cabang',
          });
        }
      } catch {
        // Fallback if network or offline
      }
    }

    setLoginLoading(false);
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

      if (typeof window !== 'undefined') {
        try {
          const existing = JSON.parse(localStorage.getItem('pilin_registered_tenants') || '[]');
          const newEntry = {
            id: res.prospectId || `reg-${Date.now()}`,
            name: regBusinessName.trim(),
            ownerName: regOwnerName.trim(),
            whatsapp: regWhatsapp.trim(),
            email: regEmail.trim(),
            employeeCount: regBranchCount,
            createdAt: new Date().toISOString(),
            status: 'NEW',
            trialStatus: 'PENDING_APPROVAL',
          };
          const filtered = existing.filter((e: any) => e.email !== newEntry.email && e.whatsapp !== newEntry.whatsapp);
          filtered.unshift(newEntry);
          localStorage.setItem('pilin_registered_tenants', JSON.stringify(filtered.slice(0, 50)));
        } catch {
          // ignore
        }
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

  // Handle Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdentifier.trim()) {
      setErrorMessage('Nomor WhatsApp atau Email wajib diisi.');
      return;
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpLoading(true);

    try {
      const res = await requestPasswordResetOtpAction(resetIdentifier.trim());
      setOtpLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      setOtpInfo({
        phone: res.phone,
        waUrl: res.waUrl,
        otpPreview: res.otpPreview,
        businessName: res.businessName,
      });
      setResetStep('VERIFY_OTP');
      setCountdown(60);
      setSuccessMessage(res.message);
    } catch (err: any) {
      setOtpLoading(false);
      setErrorMessage(err.message || 'Gagal memproses permintaan OTP.');
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setErrorMessage(null);
    setOtpLoading(true);

    try {
      const res = await requestPasswordResetOtpAction(resetIdentifier.trim());
      setOtpLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }
      setOtpInfo({
        phone: res.phone,
        waUrl: res.waUrl,
        otpPreview: res.otpPreview,
        businessName: res.businessName,
      });
      setCountdown(60);
      setSuccessMessage('Kode OTP baru telah disiapkan ke WhatsApp.');
    } catch (err: any) {
      setOtpLoading(false);
      setErrorMessage(err.message || 'Gagal mengirim ulang kode OTP.');
    }
  };

  // Handle Verify OTP and Save New Password
  const handleVerifyOtpAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetOtpCode.trim()) {
      setErrorMessage('Masukkan 6 digit kode OTP.');
      return;
    }
    if (!newPassword.trim()) {
      setErrorMessage('Kata sandi baru wajib diisi.');
      return;
    }
    if (newPassword.trim().length < 4) {
      setErrorMessage('Kata sandi baru minimal 4 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak sesuai.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setOtpLoading(true);

    try {
      const res = await verifyOtpAndSetPasswordAction(
        resetIdentifier.trim(),
        resetOtpCode.trim(),
        newPassword.trim()
      );
      setOtpLoading(false);
      if (!res.success) {
        setErrorMessage(res.message);
        return;
      }

      if (res.tenant) {
        TenantService.completeOnboarding({
          businessId: res.tenant.businessId,
          businessName: res.tenant.businessName,
          ownerName: res.tenant.ownerName,
          contactNumber: res.tenant.whatsapp,
          email: res.tenant.email,
          employeeCount: res.tenant.employeeCount || '1 Cabang',
        });
      }

      setUsername(res.tenant?.whatsapp || res.tenant?.email || resetIdentifier.trim());
      setPassword(newPassword.trim());
      setSuccessMessage('Kata sandi baru berhasil disimpan! Silakan masuk ke akun Anda.');
      setResetStep('RESET_SUCCESS');
    } catch (err: any) {
      setOtpLoading(false);
      setErrorMessage(err.message || 'Gagal memverifikasi OTP.');
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
        {activeTab !== 'REGISTER_SUCCESS' && activeTab !== 'RESET_PASSWORD' && (
          <div className="grid grid-cols-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveTab('LOGIN'); setErrorMessage(null); setSuccessMessage(null); }}
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
              onClick={() => { setActiveTab('REGISTER'); setErrorMessage(null); setSuccessMessage(null); }}
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

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold">
            {successMessage}
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
                Email / Nomor WhatsApp / ID Pegawai:
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Masukkan nomor WhatsApp atau email..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Kata Sandi / PIN Security:
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('RESET_PASSWORD');
                    setResetStep('REQUEST_OTP');
                    setResetIdentifier(username.trim());
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Lupa Password? Reset via WhatsApp
                </button>
              </div>
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
              disabled={loginLoading}
              className="w-full py-3 bg-[#F26522] hover:bg-[#d95416] text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-orange-950/40 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loginLoading ? 'MEMVERIFIKASI...' : 'MASUK KE DASHBOARD ERP'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setActiveTab('REGISTER'); setErrorMessage(null); setSuccessMessage(null); }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                Belum memiliki akun usaha? Daftar Tenant Baru →
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: DAFTAR TENANT BARU */}
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
                  placeholder="Contoh: Toko Berkah Retail / Salon Cantik"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Nama Pemilik / Penanggung Jawab (PIC):
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={regOwnerName}
                  onChange={e => setRegOwnerName(e.target.value)}
                  placeholder="Nama lengkap Anda..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Nomor WhatsApp Aktif:
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={regWhatsapp}
                  onChange={e => setRegWhatsapp(e.target.value)}
                  placeholder="081234567890"
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
                  placeholder="usaha@email.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Jumlah Cabang Operasional:
              </label>
              <select
                value={regBranchCount}
                onChange={e => setRegBranchCount(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="1 Cabang">1 Cabang (Toko Tunggal)</option>
                <option value="2-3 Cabang">2 - 3 Cabang</option>
                <option value="4-10 Cabang">4 - 10 Cabang</option>
                <option value=">10 Cabang">&gt; 10 Cabang (Enterprise)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isRegistering ? 'MEMPROSES PENDAFTARAN...' : 'KIRIM PENDAFTARAN TENANT'}</span>
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setActiveTab('LOGIN'); setErrorMessage(null); setSuccessMessage(null); }}
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

            <div>
              <h2 className="text-base font-black text-white">
                Pendaftaran Berhasil Dikirim
              </h2>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 space-y-1.5 text-left">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Nama Usaha:</span>
                <span className="text-white font-bold">{registeredSummary?.businessName}</span>
              </div>
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
                setSuccessMessage(null);
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

        {/* TAB 4: RESET PASSWORD VIA WHATSAPP OTP */}
        {activeTab === 'RESET_PASSWORD' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Reset Kata Sandi via WhatsApp OTP</span>
              </h2>
              <button
                type="button"
                onClick={() => { setActiveTab('LOGIN'); setErrorMessage(null); setSuccessMessage(null); }}
                className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕ Batal
              </button>
            </div>

            {/* STEP 1: REQUEST OTP */}
            {resetStep === 'REQUEST_OTP' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Nomor WhatsApp atau Email Terdaftar:
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={resetIdentifier}
                      onChange={e => setResetIdentifier(e.target.value)}
                      placeholder="081234567890 / email@usaha.com"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{otpLoading ? 'MENYIAPKAN OTP...' : 'KIRIM KODE OTP KE WHATSAPP'}</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('LOGIN'); setErrorMessage(null); setSuccessMessage(null); }}
                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Kembali ke Halaman Masuk
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: VERIFY OTP & SET NEW PASSWORD */}
            {resetStep === 'VERIFY_OTP' && (
              <form onSubmit={handleVerifyOtpAndSave} className="space-y-3.5">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Tujuan WhatsApp:</span>
                    <span className="text-emerald-400 font-bold">{otpInfo?.phone || resetIdentifier}</span>
                  </div>

                  {otpInfo?.waUrl && (
                    <a
                      href={otpInfo.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center py-2 px-3 bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 font-bold rounded-lg text-xs transition-all"
                    >
                      Buka Pesan WhatsApp untuk Kode OTP →
                    </a>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Masukkan 6 Digit Kode OTP:
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      maxLength={6}
                      value={resetOtpCode}
                      onChange={e => setResetOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-base tracking-widest font-mono text-center text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-black"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Kata Sandi / PIN Baru:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimal 4 karakter..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Ulangi Kata Sandi Baru:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={countdown > 0 || otpLoading}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors disabled:text-slate-600 cursor-pointer flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{countdown > 0 ? `Kirim Ulang OTP (${countdown}s)` : 'Kirim Ulang OTP'}</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{otpLoading ? 'MENYIMPAN KATA SANDI...' : 'VERIFIKASI & SIMPAN KATA SANDI'}</span>
                </button>
              </form>
            )}

            {/* STEP 3: RESET SUCCESS */}
            {resetStep === 'RESET_SUCCESS' && (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-base font-black text-white">
                    Kata Sandi Berhasil Disimpan
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('LOGIN');
                    setErrorMessage(null);
                  }}
                  className="w-full py-3 bg-[#F26522] hover:bg-[#d95416] text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>MASUK DENGAN KATA SANDI BARU</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
