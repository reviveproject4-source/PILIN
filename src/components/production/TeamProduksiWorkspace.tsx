'use client';

import React, { useState } from 'react';
import { Wrench, CheckCircle2, Clock, FileText, Send, Upload, AlertCircle } from 'lucide-react';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { EvidenceService, EvidenceRecord } from '@/domains/management/evidenceService';
import { ServiceOrderStatus } from '@/lib/types';
import { PresensiModule } from '../people/PresensiModule';

interface TeamProduksiWorkspaceProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorName?: string;
}

export function TeamProduksiWorkspace({
  businessId = 'tenant-001',
  branchId = 'branch-001',
  actorUserId = 'user-prod-01',
  actorName = 'Tim Produksi Staf',
}: TeamProduksiWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'ANTRIAN_SPK' | 'BUKTI_QC' | 'PRESENSI'>('ANTRIAN_SPK');
  const [spkOrders, setSpkOrders] = useState<WorkOrderQueueItem[]>(() => WorkQueueService.getOrders(branchId));

  // Evidence submission state - Connected directly to EvidenceService domain persistence
  const [evidenceList, setEvidenceList] = useState<EvidenceRecord[]>(() => EvidenceService.getEvidences(businessId, branchId));
  const [evidenceSpkId, setEvidenceSpkId] = useState<string>('');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');

  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshSpkOrders = () => {
    setSpkOrders(WorkQueueService.getOrders(branchId));
  };

  const refreshEvidenceList = () => {
    setEvidenceList(EvidenceService.getEvidences(businessId, branchId));
  };

  const handleUpdateSpkStatus = (spkId: string, newStatus: ServiceOrderStatus) => {
    const res = WorkQueueService.updateOrderStatus(spkId, newStatus, actorName);
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      refreshSpkOrders();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceDescription.trim()) {
      setActionMessage({ type: 'error', text: 'Deskripsi foto bukti wajib diisi.' });
      return;
    }

    const cleanSpkId = evidenceSpkId.trim() || (spkOrders[0] ? spkOrders[0].order_number : 'SO-2026-001');

    EvidenceService.addOperationalEvidence({
      spkId: cleanSpkId,
      description: evidenceDescription.trim(),
      business_id: businessId,
      branch_id: branchId,
      submitted_by: actorUserId,
    });

    refreshEvidenceList();
    setEvidenceDescription('');
    setEvidenceSpkId('');
    setActionMessage({ type: 'success', text: 'Foto bukti pengerjaan berhasil diunggah ke EvidenceService. Menunggu verifikasi QC Kepala Cabang.' });
  };

  // Metrics
  const inProgressCount = spkOrders.filter(o => o.status === 'IN_PROGRESS' || o.status === 'DIAGNOSIS').length;
  const pendingQcCount = spkOrders.filter(o => o.status === 'QC').length;

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 font-sans transition-colors">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-500" />
            <span>Workspace Produksi & Antrian SPK</span>
          </h2>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('ANTRIAN_SPK')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'ANTRIAN_SPK' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Antrian SPK ({spkOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('BUKTI_QC')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'BUKTI_QC' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Bukti Pengerjaan & QC ({evidenceList.length})
          </button>
          <button
            onClick={() => setActiveTab('PRESENSI')}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'PRESENSI' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Presensi Tim Produksi
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {actionMessage && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="font-bold hover:opacity-80">✕</button>
        </div>
      )}

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">SPK Sedang Dikerjakan</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{inProgressCount} Pesanan</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Tahap Diagnosis & Proses</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">SPK Menunggu QC</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{pendingQcCount} Pesanan</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Verifikasi QC Hasil Kerja</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Total SPK Terdaftar</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{spkOrders.length} SPK</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Cabang Utama Jakarta</div>
        </div>
      </div>

      {/* TAB 1: ANTRIAN & PENGERJAAN SPK */}
      {activeTab === 'ANTRIAN_SPK' && (
        <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daftar Antrian & Status Pengerjaan SPK</h3>
          {spkOrders.length === 0 ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-bold">
              ✓ Belum ada antrian SPK di cabang ini. Semua pesanan selesai dikerjakan!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                    <th className="p-3">No. SPK</th>
                    <th className="p-3">Pelanggan</th>
                    <th className="p-3">Layanan Jasa</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Tindakan Produksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {spkOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{order.order_number || order.id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{order.customer_name || 'Pelanggan Umum'}</td>
                      <td className="p-3">{order.service_name || 'Layanan Reguler'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] uppercase border ${
                          order.status === 'READY_FOR_PICKUP' || order.status === 'DELIVERED' || order.status === 'CLOSED' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800' :
                          order.status === 'IN_PROGRESS' || order.status === 'DIAGNOSIS' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border-amber-300 dark:border-amber-800' :
                          order.status === 'QC' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-800' :
                          'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {order.status === 'RECEIVED' && (
                          <button
                            onClick={() => handleUpdateSpkStatus(order.id, 'DIAGNOSIS')}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                          >
                            Mulai Diagnosis
                          </button>
                        )}
                        {order.status === 'DIAGNOSIS' && (
                          <button
                            onClick={() => handleUpdateSpkStatus(order.id, 'IN_PROGRESS')}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs"
                          >
                            Mulai Kerjakan
                          </button>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleUpdateSpkStatus(order.id, 'QC')}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs"
                          >
                            Ajukan Ke Inspeksi QC
                          </button>
                        )}
                        {order.status === 'QC' && (
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">Menunggu Verifikasi QC</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BUKTI PENGERJAAN & QC */}
      {activeTab === 'BUKTI_QC' && (
        <div className="space-y-6">
          <form onSubmit={handleAddEvidence} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span>Unggah Foto Bukti Hasil Kerja (QC)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Nomor SPK:</label>
                <input
                  type="text"
                  value={evidenceSpkId}
                  onChange={e => setEvidenceSpkId(e.target.value)}
                  placeholder="Contoh: SO-2026-001"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 dark:text-slate-400 block mb-1">Deskripsi Hasil Pengerjaan:</label>
                <input
                  type="text"
                  required
                  value={evidenceDescription}
                  onChange={e => setEvidenceDescription(e.target.value)}
                  placeholder="Jelaskan detail hasil kerja yang diselesaikan..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>+ UNGGAH FOTO BUKTI & AJUKAN QC KE KEPALA CABANG</span>
            </button>
          </form>

          {/* Table Evidence History */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Riwayat Unggahan Bukti Pengerjaan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 font-bold">
                    <th className="p-3">ID Bukti</th>
                    <th className="p-3">No. SPK</th>
                    <th className="p-3">Deskripsi Hasil Kerja</th>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Status Verifikasi KC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {evidenceList.map(item => (
                    <tr key={item.id} className="hover:bg-slate-100 dark:hover:bg-slate-900/60">
                      <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">{item.id}</td>
                      <td className="p-3 font-mono font-bold text-blue-600 dark:text-blue-400">{item.action_plan_id}</td>
                      <td className="p-3 text-slate-900 dark:text-white font-medium">{item.description}</td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(item.submitted_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded font-bold text-[10px] border ${
                          item.verification_state === 'VERIFIED' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' :
                          item.verification_state === 'REJECTED' ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' :
                          'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}>
                          {item.verification_state === 'VERIFIED' ? '✓ DITERIMA (ACC)' :
                           item.verification_state === 'REJECTED' ? '✕ DITOLAK' :
                           '📋 MENUNGGU VERIFIKASI KC'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRESENSI TIM PRODUKSI */}
      {activeTab === 'PRESENSI' && (
        <PresensiModule
          businessId={businessId}
          branchId={branchId}
          actorUserId={actorUserId}
          actorRole="PEGAWAI"
          actorName={actorName}
        />
      )}
    </div>
  );
}
