'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { ManagementDashboardMockup } from '@/components/website/ProductMockups';
import { ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake, Layers, AlertCircle, RefreshCw, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden bg-gradient-to-b from-slate-50/80 via-white to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-block bg-[#0F2547]/5 border border-[#0F2547]/10 px-4 py-1.5 rounded-full mb-6">
                <span className="text-xs font-bold text-[#0F2547] tracking-wide uppercase">PILIN ERP</span>
              </div>

              {/* Clean H1 Title with subtle reveal animation */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight leading-[1.15]">
                Satu Dashboard. <br className="hidden sm:inline" />
                <span className="text-[#0F2547]">Seluruh Bisnis Terhubung.</span>
              </h1>

              {/* Subheadline Text */}
              <div className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                PILIN ERP membantu bisnis menyatukan berbagai aktivitas usaha dalam satu dashboard, sekaligus membantu owner menjaga hubungan dengan customer.
              </div>

              {/* Tagline & Customer Messaging */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm font-bold text-[#F26522]">
                <span>Banyak operasi. Satu irama.</span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="animate-pulse">"Transaksi bukan akhir dari hubungan."</span>
              </div>

              {/* CTAs (Strictly allowed on Home) */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://bit.ly/konsultasipilin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-[#F26522] hover:bg-[#d95516] text-white text-base font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-[#F26522]/25 transition-all hover:scale-[1.02]"
                >
                  <span>Bicarakan Bisnis Anda</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>

                <Link
                  href="/service"
                  className="w-full sm:w-auto inline-flex items-center justify-center bg-white hover:bg-slate-50 text-[#0F2547] border-2 border-[#0F2547]/20 text-base font-bold px-8 py-3.5 rounded-xl transition-all"
                >
                  <span>Lihat PILIN ERP</span>
                </Link>
              </div>
            </div>

            {/* HERO VISUAL — DUMMY PRODUCT UI */}
            <div className="mt-12 max-w-5xl mx-auto">
              <ManagementDashboardMockup />
            </div>
          </div>
        </section>

        {/* STAGE 1: UNAWARE / SELF RECOGNITION */}
        <section className="py-14 md:py-20 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">
                Bisnis Bisa Terlihat Sibuk, Tanpa Benar-Benar Terkendali.
              </h2>
            </div>

            <div className="max-w-3xl mx-auto bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200 text-sm sm:text-base text-slate-700 leading-relaxed space-y-4">
              <p>
                Transaksi kasir berjalan setiap hari, karyawan sibuk melayani, stok barang terus berputar, dan pelanggan berdatangan.
              </p>
              <p className="font-semibold text-[#0F2547]">
                Namun tanpa data yang saling terhubung, owner sering kali baru menyadari hambatan operasional dan kebocoran biaya setelah dampaknya terasa di laporan keuangan.
              </p>
            </div>
          </div>
        </section>

        {/* STAGE 2: PROBLEM AWARE / HIDDEN ISSUES */}
        <section className="py-14 md:py-20 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">
                Masalah Bisnis Tidak Selalu Terlihat Saat Terjadi.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold mb-4">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="font-bold text-[#0F2547] text-base mb-2">Stok Berputar Lambat</div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Modal bisnis sering tertahan pada barang yang lambat terjual tanpa disadari sebelum tanggal kedaluwarsa atau penumpukan gudang.
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-4">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="font-bold text-[#0F2547] text-base mb-2">Pencatatan Terpisah</div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Kasir, persediaan, dan laporan keuangan dikelola secara terpisah, sehingga owner harus merekap data secara manual.
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-4">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div className="font-bold text-[#0F2547] text-base mb-2">Hubungan Terputus</div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  Setelah nota dicetak, tidak ada sistem yang mengawasi riwayat pelanggan untuk mendorong pembelian berulang (repeat order).
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STAGE 3: CUSTOMER PROBLEM / DIFFERENTIATOR */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-8">
              <div className="text-xs font-bold text-[#F26522] uppercase tracking-wider mb-2">
                Pembeda Utama PILIN ERP
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F2547] tracking-tight">
                Customer Sudah Pernah Membeli. Jangan Biarkan Hubungan Berhenti di Sana.
              </h2>
            </div>

            <div className="bg-[#0F2547] text-white p-8 sm:p-12 rounded-3xl max-w-4xl mx-auto text-center shadow-xl">
              <h3 className="text-xl sm:text-2xl font-black text-white mb-4">
                "PILIN ERP membantu bisnis merawat dan menjaga pelanggan."
              </h3>
              <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
                Mayoritas bisnis menghabiskan biaya tinggi untuk mencari pelanggan baru, namun lupa merawat pelanggan yang sudah ada. PILIN memastikan riwayat transaksi menjadi jembatan untuk menjaga hubungan jangka panjang.
              </p>
            </div>
          </div>
        </section>

        {/* STAGE 4: SOLUTION AWARE / ALUR KERJA */}
        <section className="py-14 md:py-20 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">
                Bisnis Membutuhkan Sistem yang Tidak Hanya Mencatat.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-10">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="inline-block bg-[#0F2547] text-white text-xs font-black px-3 py-1 rounded-md mb-4 uppercase">
                  1. TRANSAKSI & DATA
                </div>
                <h3 className="text-xl font-bold text-[#0F2547] mb-2">Apa yang terjadi</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mencatat seluruh transaksi kasir, stok barang, SPK layanan, dan arus kas dalam alur terstruktur.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="inline-block bg-[#F26522] text-white text-xs font-black px-3 py-1 rounded-md mb-4 uppercase">
                  2. INSIGHT & ALERT
                </div>
                <h3 className="text-xl font-bold text-[#0F2547] mb-2">Apa yang perlu diperhatikan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Membaca pergerakan stok lambat, tren omzet harian, dan riwayat transaksi pelanggan secara otomatis.
                </p>
              </div>

              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
                <div className="inline-block bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-md mb-4 uppercase">
                  3. ACTION & PROMOSI
                </div>
                <h3 className="text-xl font-bold text-[#0F2547] mb-2">Apa yang perlu dilakukan</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Membuat program promosi terarah dengan kalkulator promo agar margin usaha tetap aman.
                </p>
              </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 bg-[#0F2547] text-white rounded-2xl text-center text-xs font-mono font-bold overflow-x-auto whitespace-nowrap">
              TRANSAKSI → DATA → KONDISI BISNIS → INSIGHT → TINDAKAN
            </div>
          </div>
        </section>

        {/* EXPLICIT DIFFERENTIATION SECTION */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0F2547] tracking-tight">
                ERP yang Tidak Berhenti pada Operasional.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
              {/* Standard ERP */}
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 opacity-80">
                <div className="inline-block bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1 rounded-md mb-4 uppercase">
                  ERP Pada Umumnya
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Fokus Operasional Internal</h3>
                <ul className="space-y-3 text-xs text-slate-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>Hanya mencatat transaksi kasir dan laporan keuangan dasar.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>Hubungan dengan pelanggan terputus saat transaksi selesai.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-red-500 font-bold">✕</span>
                    <span>Owner harus menganalisis data secara manual untuk mengambil keputusan.</span>
                  </li>
                </ul>
              </div>

              {/* PILIN ERP */}
              <div className="bg-white p-8 rounded-3xl border-2 border-[#F26522] shadow-xl relative">
                <div className="inline-block bg-[#F26522] text-white text-xs font-bold px-3 py-1 rounded-md mb-4 uppercase">
                  PILIN ERP
                </div>
                <h3 className="text-xl font-bold text-[#0F2547] mb-3">Operasional & Hubungan Customer Terhubung</h3>
                <ul className="space-y-3 text-xs text-slate-700">
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Menyatukan 5 fungsi bisnis (People, Product, Business Process, Finance, Management).</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-[#F26522] flex-shrink-0 mt-0.5" />
                    <span className="font-bold">Menjaga riwayat dan hubungan pelanggan secara berlanjut.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span>Memberikan alert pergerakan stok dan kalkulator promo terarah.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT AWARE: 5 MODUL OVERVIEW */}
        <section className="py-16 md:py-24 bg-slate-50/70 border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-12">
              <div className="inline-block bg-[#0F2547] text-white text-xs font-extrabold px-3.5 py-1 rounded-md mb-4 uppercase tracking-wider">
                Cakupan Layanan ERP
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F2547] tracking-tight">
                5 Kelompok Utama PILIN ERP
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-10">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-[#F26522] uppercase mb-1">01</div>
                <h3 className="text-lg font-bold text-[#0F2547] mb-2">People & HR</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Employee, struktur, attendance, izin/cuti, SOP, KPI dan evaluasi kerja tim.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-[#F26522] uppercase mb-1">02</div>
                <h3 className="text-lg font-bold text-[#0F2547] mb-2">Product & Customer</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Product, service, harga, HPP, customer dan riwayat transaksi.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-[#F26522] uppercase mb-1">03</div>
                <h3 className="text-lg font-bold text-[#0F2547] mb-2">Business Process</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  POS/Sales, Inventory, Service/SPK, dan Pengelolaan Promosi Berbasis Data.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-xs font-bold text-[#F26522] uppercase mb-1">04</div>
                <h3 className="text-lg font-bold text-[#0F2547] mb-2">Finance</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Revenue, HPP, Expense, Gross Profit, Net Profit dan laporan harian/bulanan.
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                <div className="text-xs font-bold text-[#F26522] uppercase mb-1">05</div>
                <h3 className="text-lg font-bold text-[#0F2547] mb-2">Management</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dashboard, reporting, insight dan monitoring bisnis untuk owner dan kepala cabang.
                </p>
              </div>
            </div>

            <div className="text-center">
              <Link
                href="/service"
                className="inline-flex items-center justify-center bg-[#0F2547] hover:bg-[#0B1A32] text-white font-bold text-sm px-8 py-3.5 rounded-xl transition-all"
              >
                <span>Lihat Semua Layanan</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
