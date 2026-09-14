'use client';

import React, { useState } from 'react';
import { Building2, Phone, Mail, Users, Rocket, ShieldCheck } from 'lucide-react';
import { TenantService } from '@/domains/tenant/tenantService';
import { BusinessProfileService } from '@/domains/business/businessProfileService';

interface TenantOnboardingModalProps {
  onSuccess: () => void;
}

export function TenantOnboardingModal({ onSuccess }: TenantOnboardingModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCount, setEmployeeCount] = useState('1-5');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setErrorMessage('Nama Usaha wajib diisi.');
      return;
    }
    if (!contactNumber.trim()) {
      setErrorMessage('Nomor Kontak / WhatsApp wajib diisi.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Email usaha wajib diisi.');
      return;
    }
    if (!employeeCount) {
      setErrorMessage('Pilih jumlah pegawai usaha Anda.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const created = TenantService.completeOnboarding({
        businessName: businessName.trim(),
        contactNumber: contactNumber.trim(),
        email: email.trim(),
        employeeCount,
      });

      BusinessProfileService.updateProfile('tenant-001', {
        business_name: created.businessName,
        business_phone: created.contactNumber,
      });

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mendaftarkan usaha baru.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F26522] to-amber-500 text-white font-black text-2xl shadow-lg">
            P
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Selamat Datang di PILIN ERP
          </h1>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Masa Uji Coba (Trial 14 Hari) Aktif Otomatis</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Nama Usaha
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Contoh: CleanCare Laundry, AutoDetailing Pro, dll."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Nomor Kontak / WhatsApp
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="081234567890"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Email Usaha
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@usaha.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Jumlah Pegawai
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <select
                value={employeeCount}
                onChange={(e) => setEmployeeCount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F26522]"
              >
                <option value="1-5">1 - 5 Pegawai</option>
                <option value="6-15">6 - 15 Pegawai</option>
                <option value="16-50">16 - 50 Pegawai</option>
                <option value=">50">&gt; 50 Pegawai</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-[#F26522] hover:bg-[#d95416] text-white font-bold rounded-xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <Rocket className="w-4 h-4" />
            <span>{isSubmitting ? 'Memproses Enterprise Tenant...' : 'Mulai Masa Uji Coba 14 Hari →'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
