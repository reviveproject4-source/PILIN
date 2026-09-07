'use client';

import React, { useState } from 'react';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { Phone, MapPin, ExternalLink, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [clientName, setClientName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const phone = "6281215566630";
    const text = `Halo Team PILIN, saya ${clientName || 'Owner Bisnis'} dari ${businessName || 'Usaha Saya'}. Saya ingin berkonsultasi mengenai kebutuhan PILIN ERP. ${note ? 'Catatan: ' + note : ''}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* HERO */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block bg-[#0F2547]/5 border border-[#0F2547]/10 px-4 py-1.5 rounded-full mb-6">
                <span className="text-xs font-bold text-[#0F2547] uppercase tracking-wider">Konsultasi Bisnis</span>
              </div>

              {/* Clean Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">
                Setiap bisnis punya kebutuhan yang berbeda.
              </h1>

              <div className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                Ceritakan bisnis Anda. Kami bantu melihat sistem yang paling sesuai dengan skala usaha Anda.
              </div>
            </div>
          </div>
        </section>

        {/* DETAILS & FORM */}
        <section className="py-16 md:py-20 bg-white border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
              {/* Left Details */}
              <div className="bg-slate-50 p-8 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
                <h2 className="text-2xl font-bold text-[#0F2547]">Kontak Resmi PILIN ERP</h2>

                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                    <Phone className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F2547] block">WhatsApp</span>
                      <a
                        href="https://wa.me/6281215566630"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F26522] font-bold hover:underline"
                      >
                        0812 1556 6630
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                    <ExternalLink className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F2547] block">Link Konsultasi</span>
                      <a
                        href="https://bit.ly/konsultasipilin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 hover:underline text-xs"
                      >
                        https://bit.ly/konsultasipilin
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-white rounded-xl border border-slate-200">
                    <MapPin className="w-5 h-5 text-[#F26522] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#0F2547] block">Alamat Kantor</span>
                      <div className="text-slate-600 text-xs leading-relaxed mt-0.5">
                        Perum. BDB II, Blok AL, Sukahati, Cibinong, Kab. Bogor 16913
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-[#0F2547] text-white rounded-xl text-xs leading-relaxed">
                    <span className="font-bold block text-white mb-0.5">Trial 14 Hari</span>
                    <span>Trial 14 hari diberikan setelah proses konsultasi bersama Team PILIN.</span>
                  </div>
                </div>
              </div>

              {/* Right Form */}
              <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#0F2547]">Form Konsultasi</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pemilik / Pengelola</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Hendra Wijaya"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nama Bisnis / Usaha</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Toko Sejahtera / Spa Care"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Kebutuhan (Opsional)</label>
                    <textarea
                      rows={3}
                      placeholder="Contoh: Ingin menyatukan stok 3 cabang dan merawat data customer..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#F26522]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#F26522] hover:bg-[#d95516] text-white font-bold text-sm py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Hubungi PILIN ERP</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
