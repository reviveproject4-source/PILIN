'use client';

import React from 'react';
import Link from 'next/link';
import { PilinLogo } from './Navbar';
import { Phone, MapPin, ExternalLink, ArrowRight } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* FINAL CTA BAR */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
        <div className="max-w-4xl mx-auto">
          {/* Subtle animated typography reveal for final CTA */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4 transition-all duration-700">
            Jaga Customer. Jaga Omzet. Jaga Bisnis.
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed mb-8">
            PILIN membantu Anda menjalankan bisnis dengan data yang terhubung dan hubungan customer yang tetap terjaga.
          </p>

          <a
            href="https://bit.ly/konsultasipilin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center bg-[#F26522] hover:bg-[#d95516] text-white text-base font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-[#F26522]/30 transition-all hover:scale-[1.02]"
          >
            <span>Bicarakan Bisnis Anda</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
        </div>
      </section>

      {/* FOOTER NAVIGATION & DETAILS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <PilinLogo className="h-10 mb-4" />
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-4">
              PILIN ERP membantu bisnis menyatukan berbagai aktivitas usaha dalam satu dashboard, sekaligus membantu owner menjaga hubungan dengan customer.
            </p>
            <div className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} PILIN ERP. All rights reserved.
            </div>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4">Navigasi Halaman</div>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/service" className="hover:text-white transition-colors">Service / Layanan</Link></li>
              <li><Link href="/free-feature" className="hover:text-white transition-colors">Free Feature POS</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing Paket</Link></li>
              <li><a href="https://pilin-business-check.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Business Check Portal</a></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact / Konsultasi</Link></li>
            </ul>
          </div>

          <div>
            <div className="font-bold text-white text-sm mb-4">Kontak & Alamat</div>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start space-x-2">
                <Phone className="w-4 h-4 text-[#F26522] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">WhatsApp Admin PILIN</div>
                  <a
                    href="https://wa.me/6281215566630"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-[#F26522] font-bold"
                  >
                    0812 1556 6630
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <ExternalLink className="w-4 h-4 text-[#F26522] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Konsultasi Bisnis</div>
                  <a
                    href="https://bit.ly/konsultasipilin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-slate-300"
                  >
                    bit.ly/konsultasipilin
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-[#F26522] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Alamat Kantor</div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Perum. BDB II, Blok AL, Sukahati, Cibinong, Kab. Bogor 16913
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
