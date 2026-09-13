'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/website/Navbar';
import Footer from '@/components/website/Footer';
import { 
  POSCashierMockup, BusinessInsightMockup, ServiceSPKMockup, FinanceMockup 
} from '@/components/website/ProductMockups';
import { ArrowRight, CheckCircle2, ChevronRight, Layers, DollarSign, Users, Package, Wrench, MessageCircle, BarChart3 } from 'lucide-react';

export default function ServicePage() {
  const [activeTab, setActiveTab] = useState<'PROCESS' | 'PRODUCT_CUST' | 'PEOPLE_HR' | 'FINANCE' | 'MANAGEMENT'>('PROCESS');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col selection:bg-[#F26522] selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* SERVICE HERO */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-block bg-[#0F2547]/5 border border-[#0F2547]/10 px-4 py-1.5 rounded-full mb-6">
                <span className="text-xs font-bold text-[#0F2547] uppercase tracking-wider">Layanan PILIN ERP</span>
              </div>

              {/* Clean Title */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0F2547] tracking-tight">
                5 Kelompok Layanan PILIN ERP
              </h1>

              <div className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
                PILIN ERP membantu bisnis Anda menjalankan operasional harian, menghubungkan data, dan mengambil tindakan melalui 5 kelompok fungsi bisnis utama.
              </div>
            </div>
          </div>
        </section>

        {/* 5 AREAS SHOWCASE SECTION */}
        <section className="py-16 md:py-24 bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
              <button
                onClick={() => setActiveTab('PROCESS')}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activeTab === 'PROCESS'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Business Process & Promosi
              </button>

              <button
                onClick={() => setActiveTab('PRODUCT_CUST')}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activeTab === 'PRODUCT_CUST'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Product & Customer
              </button>

              <button
                onClick={() => setActiveTab('PEOPLE_HR')}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activeTab === 'PEOPLE_HR'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                People & HR
              </button>

              <button
                onClick={() => setActiveTab('FINANCE')}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activeTab === 'FINANCE'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Finance
              </button>

              <button
                onClick={() => setActiveTab('MANAGEMENT')}
                className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  activeTab === 'MANAGEMENT'
                    ? 'bg-[#0F2547] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Management
              </button>
            </div>

            {/* AREA 1: BUSINESS PROCESS & PROGRAM PROMOSI TERARAH */}
            {activeTab === 'PROCESS' && (
              <div className="max-w-4xl mx-auto space-y-10">
                <div className="bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
                  <div className="inline-block bg-[#0F2547] text-white text-xs font-bold px-3 py-1 rounded-md uppercase">
                    Kelompok Business Process
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F2547]">
                    POS / Sales, Inventory, Service / SPK, dan Pengelolaan Promosi Berbasis Data
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Bantu bisnis mengelola proses penjualan, layanan, pekerjaan, dan aktivitas operasional secara terhubung dari kasir hingga gudang.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-[#0F2547] mb-1">POS / Sales</div>
                      <div className="text-slate-600">Memproses transaksi penjualan dan mencetak nota resmi sebagai bagian dari data bisnis.</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-[#0F2547] mb-1">Inventory</div>
                      <div className="text-slate-600">Ketahui kondisi stok sebelum menjadi masalah (misal: stok dengan perputaran rendah).</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-[#0F2547] mb-1">Service / SPK</div>
                      <div className="text-slate-600">Mengatur pengerjaan teknis operasional dari penerimaan hingga penyerahan.</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-[#F26522] mb-1">Program Promosi Terarah</div>
                      <div className="text-slate-600">Kalkulator promo membantu owner menentukan harga promo ideal berdasarkan HPP dan margin.</div>
                    </div>
                  </div>

                  {/* Dummy UI Showcase */}
                  <div className="pt-2">
                    <ServiceSPKMockup />
                  </div>
                </div>

                {/* PROGRAM PROMOSI TERARAH ALUR NYATA */}
                <div className="bg-white p-6 sm:p-10 rounded-3xl border-2 border-[#F26522]/30 shadow-lg space-y-4">
                  <div className="inline-block bg-[#F26522] text-white text-xs font-bold px-3 py-1 rounded-md uppercase">
                    Alur Tindakan Owner
                  </div>
                  <h3 className="text-xl font-bold text-[#0F2547]">
                    Program Promosi Terarah & Kalkulator Promo
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Contoh alur bagaimana PILIN membantu owner membaca data dan mengambil tindakan promosi yang masuk akal:
                  </p>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-[#0F2547] block">1. Pembacaan Data</span>
                        <span>Produk A: Stok 80. Minggu lalu 40 terjual, minggu ini 15 terjual.</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-amber-600 block">2. Insight & Alert</span>
                        <span>Insight: "Produk A menunjukkan perputaran rendah."</span>
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <span className="font-bold text-[#F26522] block">3. Program Promosi Terarah</span>
                        <span>Owner membuat program promo dengan Kalkulator Promo PILIN.</span>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-900 mb-2">Simulasi Kalkulator Promo:</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block">Harga Jual</span>
                          <span className="font-bold text-slate-800">Rp 100.000</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block">HPP</span>
                          <span className="font-bold text-slate-800">Rp 60.000</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded">
                          <span className="text-slate-500 block">Harga Promo</span>
                          <span className="font-bold text-[#F26522]">Rp 80.000</span>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-800 rounded">
                          <span className="text-slate-500 block">Gross Profit</span>
                          <span className="font-bold">Rp 20.000 / unit</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#0F2547] text-white rounded-xl text-center text-xs font-mono font-bold overflow-x-auto whitespace-nowrap">
                    TRANSAKSI → DATA → INSIGHT → ALERT → ACTION → KALKULATOR PROMO → POS → NOTA → INVENTORY
                  </div>
                </div>
              </div>
            )}

            {/* AREA 2: PRODUCT & CUSTOMER */}
            {activeTab === 'PRODUCT_CUST' && (
              <div className="max-w-4xl mx-auto bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
                <div className="inline-block bg-[#0F2547] text-white text-xs font-bold px-3 py-1 rounded-md uppercase">
                  Kelompok Product & Customer
                </div>
                <h2 className="text-2xl font-bold text-[#0F2547]">
                  Product & Customer Management
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-[#0F2547] text-base mb-3">Product</h3>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li>• Product & Service Master</li>
                      <li>• Category</li>
                      <li>• Selling Price (Harga Jual)</li>
                      <li>• HPP (Harga Pokok Penjualan)</li>
                      <li>• Active / Inactive Status</li>
                    </ul>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <h3 className="font-bold text-[#0F2547] text-base mb-3">Customer</h3>
                    <ul className="space-y-2 text-xs text-slate-600">
                      <li>• Customer Master</li>
                      <li>• Contact</li>
                      <li>• Basic Information</li>
                      <li>• Transaction History</li>
                      <li>• Service History</li>
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-[#0F2547] text-white rounded-xl text-center font-bold text-xs sm:text-sm">
                  "Customer bukan sekadar data. Customer adalah hubungan yang perlu dijaga."
                </div>
              </div>
            )}

            {/* AREA 3: PEOPLE & HR */}
            {activeTab === 'PEOPLE_HR' && (
              <div className="max-w-4xl mx-auto bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
                <div className="inline-block bg-[#0F2547] text-white text-xs font-bold px-3 py-1 rounded-md uppercase">
                  Kelompok People & HR
                </div>
                <h2 className="text-2xl font-bold text-[#0F2547]">
                  People & HR Management
                </h2>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs sm:text-sm space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-800 font-semibold">
                    <div className="p-3 bg-slate-50 rounded-lg">• Employee</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Position</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Division</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Branch</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Supervisor</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Role / Access</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Attendance</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Permission</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Leave</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• SOP</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• KPI</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Evaluation</div>
                  </div>
                </div>
              </div>
            )}

            {/* AREA 4: FINANCE */}
            {activeTab === 'FINANCE' && (
              <div className="max-w-4xl mx-auto bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
                <div className="inline-block bg-[#0F2547] text-white text-xs font-bold px-3 py-1 rounded-md uppercase">
                  Kelompok Finance
                </div>
                <h2 className="text-2xl font-bold text-[#0F2547]">
                  Finance Management
                </h2>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs sm:text-sm space-y-4">
                  <div className="font-bold text-slate-900">Formula Laba-Rugi Bisnis:</div>
                  <div className="p-4 bg-slate-100 rounded-xl font-mono text-[#0F2547] space-y-1">
                    <div>Revenue - HPP = Gross Profit</div>
                    <div>Gross Profit - Expense = Net Profit</div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-lg">• Daily Report</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Monthly Report</div>
                    <div className="p-3 bg-slate-50 rounded-lg">• Branch Report</div>
                  </div>

                  <FinanceMockup />
                </div>
              </div>
            )}

            {/* AREA 5: MANAGEMENT */}
            {activeTab === 'MANAGEMENT' && (
              <div className="max-w-4xl mx-auto bg-slate-50 p-6 sm:p-10 rounded-3xl border border-slate-200 space-y-6">
                <div className="inline-block bg-[#0F2547] text-white text-xs font-bold px-3 py-1 rounded-md uppercase">
                  Kelompok Management
                </div>
                <h2 className="text-2xl font-bold text-[#0F2547]">
                  Management Control & Reporting
                </h2>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs sm:text-sm space-y-4">
                  <div className="font-bold text-slate-900">Konsep Monitoring:</div>
                  <div className="p-4 bg-[#0F2547] text-white rounded-xl font-mono text-center font-bold">
                    DATA → INSIGHT → ALERT
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="font-bold block text-[#0F2547]">Hak Akses Owner</span>
                      <span className="text-xs text-slate-600">Melihat kondisi seluruh bisnis dan semua cabang secara menyeluruh.</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <span className="font-bold block text-[#0F2547]">Hak Akses Kepala Cabang</span>
                      <span className="text-xs text-slate-600">Melihat kondisi operasional dan pencapaian cabang yang dikelolanya.</span>
                    </div>
                  </div>

                  <BusinessInsightMockup />
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
