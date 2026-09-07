'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { POSCashierMockup } from '@/components/website/ProductMockups';
import { ArrowRight } from 'lucide-react';

export default function FreeFeaturePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block bg-[#F26522] text-white text-xs font-extrabold px-3 py-1 rounded-md mb-4 uppercase tracking-wider">
                FITUR GRATIS
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">
                Mulai dari Transaksi.
              </h1>

              <div className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                PILIN menyediakan POS/Kasir Gratis sebagai titik awal penggunaan sistem. Transaksi tercatat secara terstruktur dan menjadi pintu gerbang seluruh data bisnis Anda.
              </div>
            </div>
          </div>
        </section>

        {/* DETAILS SECTION */}
        <section className="py-16 md:py-20 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {/* POS MOCKUP DISPLAY */}
            <div className="max-w-3xl mx-auto">
              <POSCashierMockup />
            </div>

            <div className="bg-slate-50 p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-[#0F2547] mb-6">
                Fitur Gratis POS / Kasir Mencakup:
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Transaksi Penjualan</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Product / Service Selection</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Quantity Input</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Payment Methods</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Discount Application</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Refund Processing</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Void Transaction</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Receipt / Cetak Nota</div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 font-semibold">• Transaction History</div>
              </div>
            </div>

            <div className="bg-[#0F2547] text-white p-8 sm:p-10 rounded-3xl text-center shadow-xl">
              <h3 className="text-xl sm:text-2xl font-black text-white mb-3">
                Setiap Transaksi Menjadi Data Bisnis.
              </h3>
              <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed mb-6">
                Dari transaksi kasir, data otomatis dapat dimanfaatkan oleh modul lanjutan: Customer, Inventory, Finance, Reporting, dan Business Insight.
              </p>

              <a
                href="https://bit.ly/konsultasipilin"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center bg-[#F26522] hover:bg-[#d95516] text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all"
              >
                <span>Mulai dengan POS Gratis</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
