'use client';

import React from 'react';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function BusinessCheckPage() {
  const BUSINESS_CHECK_URL = 'https://pilin-business-check.vercel.app/';

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block bg-[#0F2547]/5 border border-[#0F2547]/10 px-4 py-1.5 rounded-full mb-6">
                <span className="text-xs font-bold text-[#0F2547] uppercase tracking-wider">PILIN Business Check</span>
              </div>

              {/* Clean Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">
                Bisnis Anda Sehat, atau Hanya Terlihat Sibuk?
              </h1>

              <div className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                PILIN Business Check diposisikan sebagai alat evaluasi mandiri untuk membantu owner melihat kondisi riil bisnis secara obyektif.
              </div>
            </div>
          </div>
        </section>

        {/* PORTAL LAUNCH CARD */}
        <section className="py-16 md:py-20 bg-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#0F2547] text-white p-8 sm:p-12 rounded-3xl shadow-2xl text-center space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-[#F26522] text-white flex items-center justify-center font-bold mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Mulai Evaluasi Kondisi Bisnis
              </h2>

              <p className="text-slate-300 text-sm max-w-xl mx-auto leading-relaxed">
                Lihat area operasional, perputaran persediaan, dan potensi repeat order pelanggan bisnis Anda melalui portal PILIN Business Check.
              </p>

              <div className="pt-2">
                <a
                  href={BUSINESS_CHECK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center bg-[#F26522] hover:bg-[#d95516] text-white font-bold text-sm px-8 py-3.5 rounded-xl shadow-lg shadow-[#F26522]/30 transition-all hover:scale-[1.02]"
                >
                  <span>Cek Kondisi Bisnis</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
