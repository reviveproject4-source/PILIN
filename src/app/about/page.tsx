'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { ArrowRight, CheckCircle2, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* ABOUT HERO */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block bg-[#0F2547]/5 border border-[#0F2547]/10 px-4 py-1.5 rounded-full mb-6">
                <span className="text-xs font-bold text-[#0F2547] uppercase tracking-wider">Tentang PILIN ERP</span>
              </div>

              {/* Clean Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">
                Bisnis Bertumbuh. Sistem Harus Ikut Bertumbuh.
              </h1>

              <div className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Banyak bisnis berjalan setiap hari dengan begitu banyak aktivitas operasional. Namun, data dan proses sering kali belum terhubung dalam satu irama. PILIN ERP dibuat untuk menjembatani operasional internal dengan hubungan pelanggan yang berkelanjutan.
              </div>
            </div>
          </div>
        </section>

        {/* CORE PURPOSE SECTION */}
        <section className="py-16 md:py-20 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-50 p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-[#0F2547] mb-6">
                Mengapa PILIN ERP Dibuat:
              </h2>

              <div className="space-y-4 text-sm sm:text-base text-slate-700">
                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F2547] block mb-0.5">Menjalankan bisnis dengan data</span>
                    <span className="text-slate-600 text-xs sm:text-sm">Menata alur dari transaksi kasir, stok barang, hingga perintah kerja operasional secara konsisten.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F2547] block mb-0.5">Menghubungkan data operasional</span>
                    <span className="text-slate-600 text-xs sm:text-sm">Menyajikan data riil tanpa jeda atau rekap manual berhari-hari antar cabang dan tim.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F2547] block mb-0.5">Memahami kondisi bisnis secara utuh</span>
                    <span className="text-slate-600 text-xs sm:text-sm">Memberikan visibilitas langsung mengenai kesehatan keuangan, stok, dan performa tim bagi owner.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F2547] block mb-0.5">Bangun keputusan dengan informasi</span>
                    <span className="text-slate-600 text-xs sm:text-sm">Memberikan petunjuk siap tindak seperti penyesuaian promo saat stok lambat atau tren penjualan turun.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-[#0F2547] block mb-0.5">Menjaga hubungan dengan customer</span>
                    <span className="text-slate-600 text-xs sm:text-sm">Memastikan hubungan dengan pelanggan tidak berhenti saat transaksi selesai, tetapi tetap terhubung secara berkelanjutan.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contextual CTA for About Page */}
            <div className="mt-12 text-center">
              <Link
                href="/service"
                className="inline-flex items-center justify-center bg-[#0F2547] hover:bg-[#0B1A32] text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-md transition-all"
              >
                <span>Lihat Layanan PILIN ERP</span>
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
