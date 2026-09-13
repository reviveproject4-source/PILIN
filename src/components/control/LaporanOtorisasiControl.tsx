'use client';

import React, { useState } from 'react';
import { ExpenseDomainService, ExpenseRecord } from '@/domains/finance/expenseService';

export interface AuthorizationReportRecord {
  id: string;
  nota_number: string;
  type: 'DISCOUNT_GD05' | 'CANCELLATION_GD06' | 'EXPENSE_APPROVAL';
  cashier_name: string;
  branch_name: string;
  details: string;
  nominal: number;
  requested_at: string;
  decided_at?: string;
  processing_duration?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  authorizer_name: string;
  authorizer_role: string;
  audit_notes?: string;
}

export function LaporanOtorisasiControl() {
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Official Factual Control & Audit Records (ZERO INSIGHTS / ZERO AI ANALYSIS)
  const reportRecords: AuthorizationReportRecord[] = [
    {
      id: 'aut-001',
      nota_number: 'NOT-2026-0891',
      type: 'DISCOUNT_GD05',
      cashier_name: 'Siti Rahma',
      branch_name: 'Cabang Utama (Jakarta)',
      details: 'Permintaan Diskon Khusus 15% (Nominal Rp 52.500)',
      nominal: 52500,
      requested_at: '2026-08-15 10:15 WIB',
      decided_at: '2026-08-15 10:18 WIB',
      processing_duration: '3 Menit',
      status: 'APPROVED',
      authorizer_name: 'Budi Santoso',
      authorizer_role: 'KEPALA_CABANG',
      audit_notes: 'Diskon 15% disetujui sesuai wewenang Kepala Cabang (GD-05)',
    },
    {
      id: 'aut-002',
      nota_number: 'NOT-2026-0885',
      type: 'CANCELLATION_GD06',
      cashier_name: 'Budi Santoso',
      branch_name: 'Cabang Utama (Jakarta)',
      details: 'Permintaan Pembatalan Nota (Total Rp 120.000)',
      nominal: 120000,
      requested_at: '2026-08-15 09:40 WIB',
      decided_at: '2026-08-15 09:45 WIB',
      processing_duration: '5 Menit',
      status: 'APPROVED',
      authorizer_name: 'Budi Santoso',
      authorizer_role: 'KEPALA_CABANG',
      audit_notes: 'Pembatalan nota disetujui karena pelanggan membatalkan pesanan sebelum pengerjaan',
    },
    {
      id: 'aut-003',
      nota_number: 'NOT-2026-0895',
      type: 'DISCOUNT_GD05',
      cashier_name: 'Rudi Hermawan',
      branch_name: 'Cabang Bandung',
      details: 'Permintaan Diskon Khusus 20% (Nominal Rp 80.000)',
      nominal: 80000,
      requested_at: '2026-08-15 11:30 WIB',
      decided_at: '2026-08-15 11:42 WIB',
      processing_duration: '12 Menit',
      status: 'REJECTED',
      authorizer_name: 'Ahmad Fauzi',
      authorizer_role: 'KEPALA_CABANG',
      audit_notes: 'Ditolak: Persentase diskon melebihi batas promo aktif cabang',
    },
    {
      id: 'aut-004',
      nota_number: 'NOT-2026-0899',
      type: 'DISCOUNT_GD05',
      cashier_name: 'Dewi Lestari',
      branch_name: 'Cabang Bogor',
      details: 'Permintaan Diskon Khusus 12% (Nominal Rp 36.000)',
      nominal: 36000,
      requested_at: '2026-08-15 13:10 WIB',
      status: 'PENDING',
      authorizer_name: 'Menunggu Penyetuju',
      authorizer_role: 'KEPALA_CABANG',
    },
    {
      id: 'aut-005',
      nota_number: 'EXP-2026-0012',
      type: 'EXPENSE_APPROVAL',
      cashier_name: 'Agus Pratama',
      branch_name: 'Cabang Utama (Jakarta)',
      details: 'Pengeluaran Cabang OPEX Pembelian Deterjen Bulk (Rp 450.000)',
      nominal: 450000,
      requested_at: '2026-08-15 08:30 WIB',
      decided_at: '2026-08-15 08:35 WIB',
      processing_duration: '5 Menit',
      status: 'APPROVED',
      authorizer_name: 'Owner Executive',
      authorizer_role: 'OWNER',
      audit_notes: 'Pengeluaran OPEX disetujui untuk perlengkapan operasional',
    },
    {
      id: 'aut-006',
      nota_number: 'NOT-2026-0902',
      type: 'CANCELLATION_GD06',
      cashier_name: 'Siti Rahma',
      branch_name: 'Cabang Bandung',
      details: 'Permintaan Pembatalan Nota Salah Entry (Rp 250.000)',
      nominal: 250000,
      requested_at: '2026-08-15 14:05 WIB',
      status: 'PENDING',
      authorizer_name: 'Menunggu Penyetuju',
      authorizer_role: 'KEPALA_CABANG',
    },
  ];

  // Filtering
  const filteredRecords = reportRecords.filter((rec) => {
    const matchBranch = selectedBranch === 'ALL' || rec.branch_name.includes(selectedBranch);
    const matchType = selectedType === 'ALL' || rec.type === selectedType;
    const matchStatus = selectedStatus === 'ALL' || rec.status === selectedStatus;
    return matchBranch && matchType && matchStatus;
  });

  // Fact Recaps
  const totalCount = filteredRecords.length;
  const pendingCount = filteredRecords.filter((r) => r.status === 'PENDING').length;
  const approvedCount = filteredRecords.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = filteredRecords.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 font-sans">
      {/* Header Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0F2547]">
            Laporan Kontrol & Otorisasi Operasional
          </h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700">Cabang:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="ALL">Semua Cabang</option>
              <option value="Jakarta">Cabang Utama (Jakarta)</option>
              <option value="Bandung">Cabang Bandung</option>
              <option value="Bogor">Cabang Bogor</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700">Tipe Kontrol:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="ALL">Semua Tipe Kontrol</option>
              <option value="DISCOUNT_GD05">Diskon Khusus (GD-05)</option>
              <option value="CANCELLATION_GD06">Pembatalan Nota (GD-06)</option>
              <option value="EXPENSE_APPROVAL">Pengeluaran Cabang (OPEX)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-700">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold text-slate-800 text-xs focus:outline-none focus:border-[#F26522]"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">PENDING (Menunggu)</option>
              <option value="APPROVED">APPROVED (Disetujui)</option>
              <option value="REJECTED">REJECTED (Ditolak)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stat Fact Cards (NO INSIGHTS / NO RECOMMENDATIONS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Total Permintaan Otorisasi</div>
          <div className="text-2xl font-black text-slate-900">{totalCount} Item</div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-1">
          <div className="text-xs font-bold text-amber-800 uppercase">Persetujuan Menunggu (Pending)</div>
          <div className="text-2xl font-black text-amber-700">{pendingCount} Item</div>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-1">
          <div className="text-xs font-bold text-emerald-800 uppercase">Persetujuan Disetujui (Approved)</div>
          <div className="text-2xl font-black text-emerald-700">{approvedCount} Item</div>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-200 space-y-1">
          <div className="text-xs font-bold text-rose-800 uppercase">Persetujuan Ditolak (Rejected)</div>
          <div className="text-2xl font-black text-rose-700">{rejectedCount} Item</div>
        </div>
      </div>

      {/* Table 1: Status Otorisasi & Persetujuan Operasional */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-[#0F2547]">
          Status Persetujuan Operasional Kasir & Cabang
        </h2>

        {filteredRecords.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold text-center">
            Tidak ada data persetujuan otorisasi yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-extrabold uppercase">
                  <th className="p-3">No. Nota / Referensi</th>
                  <th className="p-3">Tipe Otorisasi</th>
                  <th className="p-3">Kasir / Staf Pemohon</th>
                  <th className="p-3">Cabang</th>
                  <th className="p-3">Detail Pengajuan</th>
                  <th className="p-3">Waktu Pengajuan</th>
                  <th className="p-3">PIC Penyetuju</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-[#2563EB]">{rec.nota_number}</td>
                    <td className="p-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        rec.type === 'DISCOUNT_GD05' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                        rec.type === 'CANCELLATION_GD06' ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                        'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}>
                        {rec.type === 'DISCOUNT_GD05' ? 'Diskon Khusus (GD-05)' : rec.type === 'CANCELLATION_GD06' ? 'Pembatalan Nota (GD-06)' : 'Pengeluaran OPEX'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{rec.cashier_name}</td>
                    <td className="p-3 font-medium text-slate-700">{rec.branch_name}</td>
                    <td className="p-3 font-medium text-slate-700">{rec.details}</td>
                    <td className="p-3 font-mono text-slate-600">{rec.requested_at}</td>
                    <td className="p-3 font-semibold text-slate-900">{rec.authorizer_name} ({rec.authorizer_role})</td>
                    <td className="p-3 text-center">
                      <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                        rec.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        rec.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {rec.status === 'APPROVED' ? 'DISETUJUI' : rec.status === 'REJECTED' ? 'DITOLAK' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Table 2: Audit Trail & Riwayat Kontrol Keputusan */}
      <div className="space-y-3 pt-2">
        <h2 className="text-base font-extrabold text-[#0F2547]">
          Audit Trail & Riwayat Kontrol Keputusan
        </h2>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-slate-700 font-extrabold uppercase">
                <th className="p-3">Log ID</th>
                <th className="p-3">Waktu Keputusan</th>
                <th className="p-3">No. Referensi</th>
                <th className="p-3">Otorisator (PIC & Role)</th>
                <th className="p-3 text-center">Keputusan</th>
                <th className="p-3 text-center">Waktu Proses</th>
                <th className="p-3">Catatan Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filteredRecords.filter(r => r.status !== 'PENDING').map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-mono text-slate-500">{rec.id}</td>
                  <td className="p-3 font-mono text-slate-700">{rec.decided_at}</td>
                  <td className="p-3 font-mono font-bold text-[#2563EB]">{rec.nota_number}</td>
                  <td className="p-3 font-bold text-slate-900">{rec.authorizer_name} ({rec.authorizer_role})</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase ${
                      rec.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {rec.status === 'APPROVED' ? 'DISETUJUI' : 'DITOLAK'}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-slate-700">{rec.processing_duration}</td>
                  <td className="p-3 font-medium text-slate-600">{rec.audit_notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
