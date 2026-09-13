'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Save, Upload, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { BusinessProfileService, BusinessProfileConfig } from '@/domains/business/businessProfileService';

interface IdentitasUsahaDashboardProps {
  businessId?: string;
}

export function IdentitasUsahaDashboard({ businessId = 'tenant-001' }: IdentitasUsahaDashboardProps) {
  const [profile, setProfile] = useState<BusinessProfileConfig>(() =>
    BusinessProfileService.getProfile(businessId)
  );

  const [businessName, setBusinessName] = useState<string>(profile.business_name);
  const [businessAddress, setBusinessAddress] = useState<string>(profile.business_address);
  const [businessPhone, setBusinessPhone] = useState<string>(profile.business_phone);
  const [logoUrl, setLogoUrl] = useState<string>(profile.logo_url || '');
  const [terms, setTerms] = useState<string>(profile.terms_and_conditions);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = BusinessProfileService.getProfile(businessId);
    setProfile(loaded);
    setBusinessName(loaded.business_name);
    setBusinessAddress(loaded.business_address);
    setBusinessPhone(loaded.business_phone);
    setLogoUrl(loaded.logo_url || '');
    setTerms(loaded.terms_and_conditions);
  }, [businessId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target?.result as string;
        if (base64Url) {
          setLogoUrl(base64Url);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = BusinessProfileService.updateProfile(businessId, {
      business_name: businessName,
      business_address: businessAddress,
      business_phone: businessPhone,
      logo_url: logoUrl || null,
      terms_and_conditions: terms,
    });

    setProfile(updated);
    setSuccessMessage('Konfigurasi Identitas Usaha & Nota berhasil disimpan secara permanen.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 font-sans transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <span>Identitas Usaha & Konfigurasi Nota</span>
          </h1>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Identitas Usaha */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              1. Identitas Usaha & Kontak
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Nama Usaha / Toko *
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Contoh: PILIN CLEANING & CARE"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Alamat Lengkap Usaha *
              </label>
              <input
                type="text"
                required
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Contoh: Jl. Pemuda No. 123, Jakarta Pusat"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Nomor Kontak / WhatsApp Resmi *
              </label>
              <input
                type="text"
                required
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Right Column: Logo Usaha */}
          <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Logo Usaha (Cetak & Preview Nota)
            </h2>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                )}
              </div>

              <div className="space-y-2 flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>Upload Logo Gambar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                    Atau Masukkan URL Logo:
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Width: Syarat & Ketentuan Nota */}
        <div className="space-y-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            3. Syarat & Ketentuan (S&K) Nota Transaksi
          </h2>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Teks Syarat & Ketentuan Nota (Footer Thermal 58 mm & Teks WA)
            </label>
            <textarea
              rows={4}
              required
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Contoh: 1. Barang yang telah diserahkan wajib dicek kembali saat pengambilan."
              className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500 resize-y"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Konfigurasi Usaha & Nota</span>
          </button>
        </div>
      </form>
    </div>
  );
}
