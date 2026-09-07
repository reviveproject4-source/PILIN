'use client';

import React from 'react';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* PRICING HERO */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block bg-[#0F2547]/5 border border-[#0F2547]/10 px-4 py-1.5 rounded-full mb-6">
                <span className="text-xs font-bold text-[#0F2547] uppercase tracking-wider">Harga Promo PILIN ERP</span>
              </div>

              {/* Clean Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">
                Semua modul. Satu sistem.
              </h1>

              <div className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Pilihan penggunaan PILIN yang dapat disesuaikan dengan kebutuhan bisnis.
              </div>
            </div>
          </div>
        </section>

        {/* PRICING CARDS GRID */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-12">
              {/* PACKAGE 1 */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="inline-block bg-[#0F2547] text-white text-[10px] font-extrabold px-2.5 py-1 rounded uppercase mb-4">
                    FULL MODULE
                  </div>
                  <h2 className="text-xl font-bold text-[#0F2547] mb-1">6 Bulan</h2>
                  <div className="text-xs font-semibold text-slate-500 mb-4">50 Orang</div>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-[#0F2547]">Rp2.800.000</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Akses Seluruh Modul PILIN</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Aplikasi POS / Kasir Gratis</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="https://bit.ly/konsultasipilin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-[#0F2547] hover:bg-[#0B1A32] text-white text-xs font-bold py-3 rounded-xl transition-all"
                >
                  Pilih Paket
                </a>
              </div>

              {/* PACKAGE 2 */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="inline-block bg-[#0F2547] text-white text-[10px] font-extrabold px-2.5 py-1 rounded uppercase mb-4">
                    FULL MODULE
                  </div>
                  <h2 className="text-xl font-bold text-[#0F2547] mb-1">6 Bulan</h2>
                  <div className="text-xs font-semibold text-slate-500 mb-4">100 Orang</div>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-[#0F2547]">Rp5.000.000</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Akses Seluruh Modul PILIN</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Aplikasi POS / Kasir Gratis</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="https://bit.ly/konsultasipilin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-[#0F2547] hover:bg-[#0B1A32] text-white text-xs font-bold py-3 rounded-xl transition-all"
                >
                  Pilih Paket
                </a>
              </div>

              {/* PACKAGE 3 (PALING EKONOMIS) */}
              <div className="bg-white p-6 rounded-3xl border-2 border-[#F26522] shadow-xl flex flex-col justify-between relative transform lg:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#F26522] text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow">
                  PALING EKONOMIS
                </div>

                <div>
                  <div className="inline-block bg-[#0F2547] text-white text-[10px] font-extrabold px-2.5 py-1 rounded uppercase mb-4 mt-2">
                    FULL MODULE
                  </div>
                  <h2 className="text-xl font-bold text-[#0F2547] mb-1">12 Bulan</h2>
                  <div className="text-xs font-semibold text-[#F26522] mb-4">50 Orang</div>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-[#0F2547]">Rp5.000.000</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-[#F26522] flex-shrink-0" />
                      <span className="font-bold">Paket Paling Ekonomis 1 Tahun</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Akses Seluruh Modul PILIN</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Aplikasi POS / Kasir Gratis</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="https://bit.ly/konsultasipilin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-[#F26522] hover:bg-[#d95516] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md"
                >
                  Bicarakan Bisnis Anda
                </a>
              </div>

              {/* PACKAGE 4 */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="inline-block bg-[#0F2547] text-white text-[10px] font-extrabold px-2.5 py-1 rounded uppercase mb-4">
                    FULL MODULE
                  </div>
                  <h2 className="text-xl font-bold text-[#0F2547] mb-1">12 Bulan</h2>
                  <div className="text-xs font-semibold text-slate-500 mb-4">100 Orang</div>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-[#0F2547]">Rp9.500.000</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 mb-6">
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Akses Seluruh Modul PILIN</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Aplikasi POS / Kasir Gratis</span>
                    </li>
                  </ul>
                </div>

                <a
                  href="https://bit.ly/konsultasipilin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center bg-[#0F2547] hover:bg-[#0B1A32] text-white text-xs font-bold py-3 rounded-xl transition-all"
                >
                  Pilih Paket
                </a>
              </div>
            </div>

            {/* PACKAGE 5: ENTERPRISE */}
            <div className="max-w-4xl mx-auto bg-slate-900 text-white p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
              <div>
                <div className="inline-block bg-[#F26522] text-white text-[10px] font-extrabold px-3 py-1 rounded uppercase mb-2">
                  ENTERPRISE
                </div>
                <h3 className="text-xl font-bold text-white">Kebutuhan bisnis lebih besar atau lebih khusus?</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Silakan hubungi Admin PILIN.
                </p>
              </div>

              <a
                href="https://wa.me/6281215566630"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#F26522] hover:bg-[#d95516] text-white text-xs font-bold px-6 py-3.5 rounded-xl transition-all whitespace-nowrap shadow-md"
              >
                Hubungi Admin
              </a>
            </div>

            {/* PRICING PROMO NOTE */}
            <div className="max-w-3xl mx-auto text-center text-xs text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              Modul PILIN dirancang modular dan dapat diaktifkan sesuai kebutuhan bisnis. Selama masa promo, seluruh modul tersedia dalam paket Full Module.
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
