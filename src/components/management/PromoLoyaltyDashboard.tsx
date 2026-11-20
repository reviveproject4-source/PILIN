'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Percent,
  Calendar,
  Gift,
  Coins,
  Plus,
  Trash2,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  Save,
  Clock,
  ToggleLeft,
  ToggleRight,
  Send,
  X,
  FileText,
} from 'lucide-react';
import {
  PromoManagementService,
  PromoBundleConfig,
  PromoBasicItem,
  PromoGeneralItem,
  PromoVoucherItem,
  PromoPoinConfig,
} from '@/domains/promo/promoManagementService';

interface PromoLoyaltyDashboardProps {
  businessId?: string;
}

export function PromoLoyaltyDashboard({
  businessId = '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
}: PromoLoyaltyDashboardProps) {
  // Sub-tabs: 'BASIC' | 'GENERAL' | 'VOUCHER' | 'POIN'
  const [activeTab, setActiveTab] = useState<'BASIC' | 'GENERAL' | 'VOUCHER' | 'POIN'>('BASIC');

  // Master Promo Bundle State
  const [bundle, setBundle] = useState<PromoBundleConfig>(() =>
    PromoManagementService.getConfig(businessId)
  );

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal / Form States
  const [showAddBasicModal, setShowAddBasicModal] = useState(false);
  const [newBasicName, setNewBasicName] = useState('');
  const [newBasicPercentage, setNewBasicPercentage] = useState<number>(10);
  const [newBasicAllowOverride, setNewBasicAllowOverride] = useState<boolean>(true);

  const [showAddGeneralModal, setShowAddGeneralModal] = useState(false);
  const [newGenTitle, setNewGenTitle] = useState('');
  const [newGenDiscount, setNewGenDiscount] = useState('');
  const [newGenStartDate, setNewGenStartDate] = useState('');
  const [newGenEndDate, setNewGenEndDate] = useState('');
  const [newGenImage, setNewGenImage] = useState<string | null>(null);
  const [newGenTemplate, setNewGenTemplate] = useState('');

  const [showAddVoucherModal, setShowAddVoucherModal] = useState(false);
  const [newVchCode, setNewVchCode] = useState('');
  const [newVchTitle, setNewVchTitle] = useState('');
  const [newVchDiscountValue, setNewVchDiscountValue] = useState<number>(25000);
  const [newVchMinTrx, setNewVchMinTrx] = useState<number>(3);
  const [newVchValidUntil, setNewVchValidUntil] = useState('');
  const [newVchImage, setNewVchImage] = useState<string | null>(null);
  const [newVchTemplate, setNewVchTemplate] = useState('');

  // Poin Config State
  const [poinActive, setPoinActive] = useState<boolean>(bundle.poin.is_active);
  const [earningThreshold, setEarningThreshold] = useState<number>(bundle.poin.earning_threshold);
  const [pointRedeemValue, setPointRedeemValue] = useState<number>(bundle.poin.point_redeem_value);
  const [minRedeemPoints, setMinRedeemPoints] = useState<number>(bundle.poin.min_redeem_points);

  const generalFileInputRef = useRef<HTMLInputElement>(null);
  const voucherFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loaded = PromoManagementService.getConfig(businessId);
    setBundle(loaded);
    setPoinActive(loaded.poin.is_active);
    setEarningThreshold(loaded.poin.earning_threshold);
    setPointRedeemValue(loaded.poin.point_redeem_value);
    setMinRedeemPoints(loaded.poin.min_redeem_points);
  }, [businessId]);

  const saveUpdatedBundle = (newBundle: PromoBundleConfig) => {
    setBundle(newBundle);
    PromoManagementService.saveConfig(newBundle, businessId);
  };

  // Image Upload Handlers (Supports Camera / Gallery)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const base64 = loadEvent.target?.result as string;
        if (base64) setter(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // 1. ADD PROMO BASIC
  const handleAddBasic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBasicName.trim()) {
      setFeedback({ type: 'error', text: 'Nama promo basic wajib diisi.' });
      return;
    }

    const newItem: PromoBasicItem = {
      id: `basic-${Date.now()}`,
      name: newBasicName.trim(),
      percentage: Number(newBasicPercentage) || 0,
      allow_cashier_override: newBasicAllowOverride,
      is_active: true,
    };

    const updated: PromoBundleConfig = {
      ...bundle,
      basics: [...bundle.basics, newItem],
      updated_at: new Date().toISOString(),
    };

    saveUpdatedBundle(updated);
    setShowAddBasicModal(false);
    setNewBasicName('');
    setNewBasicPercentage(10);
    setNewBasicAllowOverride(true);
    setFeedback({ type: 'success', text: `Promo basic "${newItem.name}" (${newItem.percentage}%) berhasil ditambahkan.` });
  };

  const handleToggleBasicActive = (id: string) => {
    const updated: PromoBundleConfig = {
      ...bundle,
      basics: bundle.basics.map((b) => (b.id === id ? { ...b, is_active: !b.is_active } : b)),
      updated_at: new Date().toISOString(),
    };
    saveUpdatedBundle(updated);
  };

  const handleDeleteBasic = (id: string) => {
    const updated: PromoBundleConfig = {
      ...bundle,
      basics: bundle.basics.filter((b) => b.id !== id),
      updated_at: new Date().toISOString(),
    };
    saveUpdatedBundle(updated);
    setFeedback({ type: 'success', text: 'Promo basic berhasil dihapus.' });
  };

  // 2. ADD PROMO GENERAL
  const handleAddGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGenTitle.trim() || !newGenStartDate || !newGenEndDate) {
      setFeedback({ type: 'error', text: 'Judul, Tanggal Mulai, dan Tanggal Selesai wajib diisi.' });
      return;
    }

    const newItem: PromoGeneralItem = {
      id: `gen-${Date.now()}`,
      title: newGenTitle.trim(),
      discount_label: newGenDiscount.trim() || 'Diskon Khusus',
      start_date: newGenStartDate,
      end_date: newGenEndDate,
      image_url: newGenImage,
      wa_message_template: newGenTemplate.trim() || `Halo Sahabat! Nikmati "${newGenTitle.trim()}" di outlet kami. Berlaku ${newGenStartDate} s/d ${newGenEndDate}!`,
      is_active: true,
    };

    const updated: PromoBundleConfig = {
      ...bundle,
      generals: [...bundle.generals, newItem],
      updated_at: new Date().toISOString(),
    };

    saveUpdatedBundle(updated);
    setShowAddGeneralModal(false);
    setNewGenTitle('');
    setNewGenDiscount('');
    setNewGenStartDate('');
    setNewGenEndDate('');
    setNewGenImage(null);
    setNewGenTemplate('');
    setFeedback({ type: 'success', text: `Promo general "${newItem.title}" berhasil ditambahkan & tersinkron ke Kasir CRM.` });
  };

  const handleToggleGeneralActive = (id: string) => {
    const updated: PromoBundleConfig = {
      ...bundle,
      generals: bundle.generals.map((g) => (g.id === id ? { ...g, is_active: !g.is_active } : g)),
      updated_at: new Date().toISOString(),
    };
    saveUpdatedBundle(updated);
  };

  const handleDeleteGeneral = (id: string) => {
    const updated: PromoBundleConfig = {
      ...bundle,
      generals: bundle.generals.filter((g) => g.id !== id),
      updated_at: new Date().toISOString(),
    };
    saveUpdatedBundle(updated);
    setFeedback({ type: 'success', text: 'Promo general berhasil dihapus.' });
  };

  // 3. ADD VOUCHER LOYAL
  const handleAddVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVchCode.trim() || !newVchTitle.trim()) {
      setFeedback({ type: 'error', text: 'Kode voucher dan Judul wajib diisi.' });
      return;
    }

    const newItem: PromoVoucherItem = {
      id: `vch-${Date.now()}`,
      code: newVchCode.trim().toUpperCase(),
      title: newVchTitle.trim(),
      discount_value: Number(newVchDiscountValue) || 0,
      min_total_trx: Number(newVchMinTrx) || 1,
      image_url: newVchImage,
      valid_until: newVchValidUntil || '2026-12-31',
      wa_message_template: newVchTemplate.trim() || `Spesial untuk Kakak pelanggan setia! Gunakan kode voucher *${newVchCode.trim().toUpperCase()}* untuk potongan Rp ${Number(newVchDiscountValue).toLocaleString('id-ID')} pada transaksi berikutnya.`,
      is_active: true,
    };

    const updated: PromoBundleConfig = {
      ...bundle,
      vouchers: [...bundle.vouchers, newItem],
      updated_at: new Date().toISOString(),
    };

    saveUpdatedBundle(updated);
    setShowAddVoucherModal(false);
    setNewVchCode('');
    setNewVchTitle('');
    setNewVchDiscountValue(25000);
    setNewVchMinTrx(3);
    setNewVchValidUntil('');
    setNewVchImage(null);
    setNewVchTemplate('');
    setFeedback({ type: 'success', text: `Voucher loyal "${newItem.code}" berhasil ditambahkan & tersinkron ke Kasir CRM.` });
  };

  const handleToggleVoucherActive = (id: string) => {
    const updated: PromoBundleConfig = {
      ...bundle,
      vouchers: bundle.vouchers.map((v) => (v.id === id ? { ...v, is_active: !v.is_active } : v)),
      updated_at: new Date().toISOString(),
    };
    saveUpdatedBundle(updated);
  };

  const handleDeleteVoucher = (id: string) => {
    const updated: PromoBundleConfig = {
      ...bundle,
      vouchers: bundle.vouchers.filter((v) => v.id !== id),
      updated_at: new Date().toISOString(),
    };
    saveUpdatedBundle(updated);
    setFeedback({ type: 'success', text: 'Voucher berhasil dihapus.' });
  };

  // 4. SAVE POIN CONFIG
  const handleSavePoin = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPoin: PromoPoinConfig = {
      is_active: poinActive,
      earning_threshold: Number(earningThreshold) || 10000,
      point_redeem_value: Number(pointRedeemValue) || 1000,
      min_redeem_points: Number(minRedeemPoints) || 1,
    };

    const updated: PromoBundleConfig = {
      ...bundle,
      poin: updatedPoin,
      updated_at: new Date().toISOString(),
    };

    saveUpdatedBundle(updated);
    setFeedback({ type: 'success', text: 'Konfigurasi Poin Loyalty berhasil disimpan permanen & aktif di nota kasir.' });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span>Menu Promo &amp; Loyalty</span>
          </h1>
        </div>

        {/* 4 Pilar Switcher */}
        <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('BASIC')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'BASIC'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>1. Promo Basic</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('GENERAL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'GENERAL'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. Promo General</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('VOUCHER')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'VOUCHER'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>3. Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('POIN')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'POIN'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>4. Poin Loyalty</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: PROMO BASIC */}
      {activeTab === 'BASIC' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Promo Basic (Langsung Dihitung Pada Form Nota POS)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddBasicModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Promo Basic</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {bundle.basics.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleBasicActive(item.id)}
                      className="cursor-pointer"
                      title={item.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                    >
                      {item.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 dark:bg-slate-800">
                          Nonaktif
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {item.percentage}%
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-bold flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Izin Kasir Ubah Persentase:</span>
                    {item.allow_cashier_override ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-black">Diizinkan</span>
                    ) : (
                      <span className="text-slate-400 font-semibold">Terkunci (Fixed)</span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteBasic(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Promo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: PROMO GENERAL (Awal Bulan / Gajian + Gambar) */}
      {activeTab === 'GENERAL' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Promo General (Tersambung ke Kasir CRM untuk Kirim WA)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddGeneralModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Promo General</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundle.generals.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleGeneralActive(item.id)}
                      className="cursor-pointer"
                    >
                      {item.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 dark:bg-slate-800">
                          Nonaktif
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {item.discount_label}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Periode: {item.start_date} s/d {item.end_date}</span>
                  </div>

                  {item.image_url ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt="Flyer Promo" className="w-full h-40 object-cover" />
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                      Tidak ada lampiran flyer
                    </div>
                  )}

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{item.wa_message_template}&rdquo;
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteGeneral(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Promo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VOUCHER (Konsumen Loyal + Gambar) */}
      {activeTab === 'VOUCHER' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Voucher Konsumen Loyal (Tersambung ke Kasir CRM untuk Kirim WA)
            </h2>
            <button
              type="button"
              onClick={() => setShowAddVoucherModal(true)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Voucher Baru</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundle.vouchers.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-purple-600 dark:text-purple-400 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30">
                      {item.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleVoucherActive(item.id)}
                      className="cursor-pointer"
                    >
                      {item.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          Aktif
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-500 dark:bg-slate-800">
                          Nonaktif
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {item.title}
                  </div>

                  <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                    Rp {item.discount_value.toLocaleString('id-ID')}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-bold">
                    <span>Kriteria Loyal: Min. {item.min_total_trx}x Transaksi</span>
                    <span>Berlaku s/d: {item.valid_until}</span>
                  </div>

                  {item.image_url ? (
                    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-40 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt="Voucher Flyer" className="w-full h-40 object-cover" />
                    </div>
                  ) : null}

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 italic">
                    &ldquo;{item.wa_message_template}&rdquo;
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteVoucher(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Voucher"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: POIN LOYALTY & PENUKARAN */}
      {activeTab === 'POIN' && (
        <form onSubmit={handleSavePoin} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              Konfigurasi Poin Loyalty &amp; Penukaran Poin di Nota POS
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Status Program Poin:</span>
              <button
                type="button"
                onClick={() => setPoinActive(!poinActive)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  poinActive
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {poinActive ? 'AKTIF' : 'NONAKTIF'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Rasio Perolehan Poin (Kelipatan Belanja Rp) *
              </label>
              <input
                type="number"
                min={1000}
                step={1000}
                required
                value={earningThreshold}
                onChange={(e) => setEarningThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Nilai Tukar Poin (1 Poin = Potongan Rp) *
              </label>
              <input
                type="number"
                min={100}
                step={100}
                required
                value={pointRedeemValue}
                onChange={(e) => setPointRedeemValue(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Batas Minimal Penukaran Poin di Nota *
              </label>
              <input
                type="number"
                min={1}
                required
                value={minRedeemPoints}
                onChange={(e) => setMinRedeemPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 font-bold space-y-1">
            <div>💡 Simulasi Aturan Poin:</div>
            <div className="font-medium">
              • Setiap transaksi kelipatan <strong>Rp {earningThreshold.toLocaleString('id-ID')}</strong>, konsumen memperoleh <strong>1 Poin Loyalty</strong>.
            </div>
            <div className="font-medium">
              • Saat membuat nota di Kasir, jika konsumen memiliki minimal <strong>{minRedeemPoints} Poin</strong>, kasir dapat mencentang opsi potong poin (1 Poin = <strong>Rp {pointRedeemValue.toLocaleString('id-ID')}</strong> potongan nota).
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan Poin</span>
            </button>
          </div>
        </form>
      )}

      {/* MODAL 1: TAMBAH PROMO BASIC */}
      {showAddBasicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-blue-600 flex items-center gap-2">
                <Percent className="w-5 h-5 text-blue-600" />
                <span>Tambah Promo Basic</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddBasicModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBasic} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Promo Basic *
                </label>
                <input
                  type="text"
                  required
                  value={newBasicName}
                  onChange={(e) => setNewBasicName(e.target.value)}
                  placeholder="Contoh: Diskon Pelanggan Baru, Promo Kiloan..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Persentase Diskon (%) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={newBasicPercentage}
                  onChange={(e) => setNewBasicPercentage(Number(e.target.value))}
                  placeholder="10"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-black text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    Kasir Boleh Mengganti Nominal Persentase di Nota
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewBasicAllowOverride(!newBasicAllowOverride)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    newBasicAllowOverride
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {newBasicAllowOverride ? 'BOLEH' : 'TIDAK'}
                </button>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddBasicModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Simpan Promo Basic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TAMBAH PROMO GENERAL */}
      {showAddGeneralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-emerald-600 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <span>Tambah Promo General</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddGeneralModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGeneral} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Judul Promo General *
                </label>
                <input
                  type="text"
                  required
                  value={newGenTitle}
                  onChange={(e) => setNewGenTitle(e.target.value)}
                  placeholder="Contoh: Promo Gajian Payday, Promo Awal Bulan..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Label / Nilai Diskon Promo *
                </label>
                <input
                  type="text"
                  required
                  value={newGenDiscount}
                  onChange={(e) => setNewGenDiscount(e.target.value)}
                  placeholder="Contoh: Diskon 20% Min. 10 Kg, Potongan Rp 15rb..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Mulai Berlaku *
                  </label>
                  <input
                    type="date"
                    required
                    value={newGenStartDate}
                    onChange={(e) => setNewGenStartDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Tanggal Berakhir *
                  </label>
                  <input
                    type="date"
                    required
                    value={newGenEndDate}
                    onChange={(e) => setNewGenEndDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Upload Gambar Flyer Promo (Galeri / Kamera) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lampiran Gambar Flyer Promo (Dari Kamera / Galeri):
                </label>
                <input
                  ref={generalFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileChange(e, setNewGenImage)}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => generalFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Pilih Foto dari Galeri / Kamera</span>
                  </button>
                  {newGenImage && (
                    <button
                      type="button"
                      onClick={() => setNewGenImage(null)}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
                {newGenImage && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-36 flex items-center justify-center bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newGenImage} alt="Preview Flyer" className="w-full h-36 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Template Teks Pesan WhatsApp (Dikirim Oleh Kasir CRM) *
                </label>
                <textarea
                  rows={3}
                  value={newGenTemplate}
                  onChange={(e) => setNewGenTemplate(e.target.value)}
                  placeholder="Ketik pesan promosi yang akan dikirim via WA..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGeneralModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Simpan Promo General
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: TAMBAH VOUCHER LOYAL */}
      {showAddVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-purple-600 flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600" />
                <span>Tambah Voucher Konsumen Loyal</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddVoucherModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVoucher} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kode Voucher *
                  </label>
                  <input
                    type="text"
                    required
                    value={newVchCode}
                    onChange={(e) => setNewVchCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: LOYAL50K"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-black text-purple-600 dark:text-purple-400 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Nominal Diskon (Rp) *
                  </label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={newVchDiscountValue}
                    onChange={(e) => setNewVchDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama / Judul Voucher *
                </label>
                <input
                  type="text"
                  required
                  value={newVchTitle}
                  onChange={(e) => setNewVchTitle(e.target.value)}
                  placeholder="Contoh: Voucher Apresiasi Loyalitas Rp 25.000..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kriteria Loyalitas (Min. Total Trx) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newVchMinTrx}
                    onChange={(e) => setNewVchMinTrx(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Berlaku Sampai Tanggal:
                  </label>
                  <input
                    type="date"
                    value={newVchValidUntil}
                    onChange={(e) => setNewVchValidUntil(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Upload Gambar Flyer Voucher (Galeri / Kamera) */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Lampiran Gambar Voucher (Dari Kamera / Galeri):
                </label>
                <input
                  ref={voucherFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageFileChange(e, setNewVchImage)}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => voucherFileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-300 dark:border-slate-700 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-purple-600" />
                    <span>Pilih Foto dari Galeri / Kamera</span>
                  </button>
                  {newVchImage && (
                    <button
                      type="button"
                      onClick={() => setNewVchImage(null)}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Hapus Foto
                    </button>
                  )}
                </div>
                {newVchImage && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-36 flex items-center justify-center bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={newVchImage} alt="Preview Voucher" className="w-full h-36 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Template Teks Pesan WhatsApp Voucher (Dikirim Oleh Kasir CRM) *
                </label>
                <textarea
                  rows={3}
                  value={newVchTemplate}
                  onChange={(e) => setNewVchTemplate(e.target.value)}
                  placeholder="Ketik pesan voucher yang dikirim via WA..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVoucherModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Simpan Voucher Loyal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
