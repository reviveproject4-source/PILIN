'use client';

import React, { useState } from 'react';
import { ServiceOrderStatus, QCStatus } from '@/lib/types';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { PresensiModule } from './PresensiModule';
import { BroadcastCameraModal } from '../broadcast/BroadcastCameraModal';

interface PegawaiTaskWorkspaceProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorName?: string;
}

export function PegawaiTaskWorkspace({
  businessId = 'tenant-001',
  branchId = 'branch-001',
  actorUserId = 'user-emp-01',
  actorName = 'Pegawai Staf',
}: PegawaiTaskWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<'PEKERJAAN' | 'KOMUNIKASI' | 'PRESENSI'>('PEKERJAAN');
  const [spkOrders, setSpkOrders] = useState<WorkOrderQueueItem[]>(() => WorkQueueService.getOrders(branchId));
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);

  // Evidence submission local state
  const [evidenceList, setEvidenceList] = useState([
    { id: 'evd-101', spkId: 'SO-2026-001', description: 'Foto pembersihan permukaan & pengerjaan tahap 1', status: 'MENUNGGU_VERIFIKASI_KC', timestamp: '10:30 WIB' },
  ]);
  const [evidenceSpkId, setEvidenceSpkId] = useState<string>('');
  const [evidenceDescription, setEvidenceDescription] = useState<string>('');

  // Notification Banner
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshSpkOrders = () => {
    setSpkOrders(WorkQueueService.getOrders(branchId));
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

  const handleLogProgress = (spkId: string) => {
    const percentStr = prompt('Masukkan Persentase Progress Pengerjaan (0-100):');
    if (percentStr === null) return;
    const percent = parseInt(percentStr, 10);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setActionMessage({ type: 'error', text: 'Persentase progress harus angka antara 0-100.' });
      return;
    }
    setActionMessage({ type: 'success', text: `Progress pengerjaan SPK '${spkId}' berhasil dicatat (${percent}%).` });
  };

  const handleAddEvidence = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceDescription.trim()) {
      setActionMessage({ type: 'error', text: 'Deskripsi foto bukti wajib diisi.' });
      return;
    }

    const newEvd = {
      id: `evd-${Date.now()}`,
      spkId: evidenceSpkId || 'SO-PRIBADI',
      description: evidenceDescription.trim(),
      status: 'MENUNGGU_VERIFIKASI_KC',
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };

    setEvidenceList([newEvd, ...evidenceList]);
    setEvidenceDescription('');
    setActionMessage({ type: 'success', text: 'Foto bukti pengerjaan berhasil diunggah. Menunggu verifikasi Kepala Cabang.' });
  };

  const handleSubmitForQc = (spkId: string) => {
    const res = WorkQueueService.updateOrderStatus(spkId, 'QC', actorName);
    if (res.success) {
      setActionMessage({ type: 'success', text: `SPK '${spkId}' berhasil diajukan untuk Inspeksi QC.` });
      refreshSpkOrders();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  // Metrics
  const inProgressCount = spkOrders.filter(o => o.status === 'IN_PROGRESS').length;
  const pendingQcCount = spkOrders.filter(o => o.status === 'QC').length;

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', display: 'flex' }}>
      {/* SIDEBAR NAVIGATION — OFFICIAL IA FOR PEGAWAI */}
      <aside style={{ width: '250px', backgroundColor: '#0b172a', borderRight: '1px solid #1e293b', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.05em', marginBottom: '4px' }}>PEGAWAI STAF</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>Workspace Pengerjaan</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* PEKERJAAN */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>PEKERJAAN</div>
            <button
              onClick={() => setActiveSection('PEKERJAAN')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeSection === 'PEKERJAAN' ? '#2563eb' : 'transparent',
                color: activeSection === 'PEKERJAAN' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Antrian & Pengerjaan SPK
            </button>
          </div>

          {/* KOMUNIKASI */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>KOMUNIKASI</div>
            <button
              onClick={() => setActiveSection('KOMUNIKASI')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeSection === 'KOMUNIKASI' ? '#2563eb' : 'transparent',
                color: activeSection === 'KOMUNIKASI' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retensi & Komunikasi Pelanggan
            </button>
          </div>

          {/* KEHADIRAN */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>KEHADIRAN</div>
            <button
              onClick={() => setActiveSection('PRESENSI')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeSection === 'PRESENSI' ? '#2563eb' : 'transparent',
                color: activeSection === 'PRESENSI' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Presensi Pribadi
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN WORKSPACE */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
              Workspace Pengerjaan Pegawai
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setShowBroadcastModal(true)}
              style={{
                padding: '6px 14px',
                backgroundColor: '#F26522',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              📸 Broadcast Camera
            </button>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', padding: '3px 10px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569' }}>
                PEGAWAI STAF
              </span>
            </div>
          </div>
        </div>

        <BroadcastCameraModal
          isOpen={showBroadcastModal}
          onClose={() => setShowBroadcastModal(false)}
        />

        {/* Action Notification Banner */}
        {actionMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: actionMessage.type === 'success' ? '#064e3b' : '#7f1d1d',
            border: `1px solid ${actionMessage.type === 'success' ? '#059669' : '#dc2626'}`,
            color: actionMessage.type === 'success' ? '#a7f3d0' : '#fecaca',
            fontSize: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
          </div>
        )}

        {/* LEVEL 1: PEKERJAAN SAYA HARI INI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Tugas Ditugaskan</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#38bdf8', margin: '8px 0 0 0' }}>{spkOrders.length} SPK</div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Sedang Dikerjakan</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b', margin: '8px 0 0 0' }}>{inProgressCount} SPK</div>
          </div>

          <div style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Menunggu Inspeksi QC</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', margin: '8px 0 0 0' }}>{pendingQcCount} SPK</div>
          </div>

          <div onClick={() => setActiveSection('PRESENSI')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Presensi Hari Ini</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', margin: '12px 0 0 0' }}>🟢 Hadir (07:55 WIB)</div>
          </div>
        </div>

        {/* SECTION: PEKERJAAN */}
        {activeSection === 'PEKERJAAN' && (
          <>
            {/* LEVEL 2: YANG HARUS DIKERJAKAN */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', margin: '0 0 16px 0' }}>
                Yang Harus Dikerjakan
              </h2>

              {spkOrders.length === 0 ? (
                <div style={{ padding: '12px 16px', background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                  ✓ Tidak ada pekerjaan yang perlu dilakukan saat ini.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {spkOrders.filter(o => o.status === 'RECEIVED' || o.status === 'IN_PROGRESS').map(order => (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: order.status === 'RECEIVED' ? '4px solid #3b82f6' : '4px solid #f59e0b' }}>
                      <div>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: order.status === 'RECEIVED' ? '#3b82f6' : '#f59e0b', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>
                          {order.status === 'RECEIVED' ? 'Tugas Baru' : 'Sedang Dikerjakan'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{order.order_number} — {order.customer_name} ({order.service_name})</span>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {order.status === 'RECEIVED' && (
                          <button onClick={() => handleUpdateSpkStatus(order.id, 'IN_PROGRESS')} style={{ padding: '6px 12px', background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>⚙️ Mulai Pengerjaan</button>
                        )}
                        {order.status === 'IN_PROGRESS' && (
                          <>
                            <button onClick={() => handleLogProgress(order.id)} style={{ padding: '6px 12px', background: '#d97706', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Catat Progress (%)</button>
                            <button onClick={() => handleSubmitForQc(order.id)} style={{ padding: '6px 12px', background: '#7c3aed', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>🔍 Ajukan QC</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* LEVEL 3: PROGRESS PEKERJAAN SAYA */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', marginBottom: '28px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#38bdf8' }}>
                Antrian & Pengerjaan SPK
              </h2>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: '#0f172a' }}>
                      <th style={{ padding: '12px' }}>No. SPK</th>
                      <th style={{ padding: '12px' }}>Nama Pelanggan</th>
                      <th style={{ padding: '12px' }}>Layanan Jasa</th>
                      <th style={{ padding: '12px' }}>Progress & Status</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Tindakan Pegawai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {spkOrders.map((order) => {
                      const progressPercent =
                        order.status === 'CLOSED' || order.status === 'DELIVERED' || order.status === 'READY_FOR_PICKUP' ? 100 :
                        order.status === 'QC' ? 85 :
                        order.status === 'IN_PROGRESS' ? 50 : 25;

                      return (
                        <tr key={order.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>{order.order_number}</td>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#f8fafc' }}>{order.customer_name}</td>
                          <td style={{ padding: '12px', color: '#cbd5e1' }}>{order.service_name}</td>
                          <td style={{ padding: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#10b981' : progressPercent >= 85 ? '#8b5cf6' : progressPercent >= 50 ? '#3b82f6' : '#f59e0b' }}></div>
                              </div>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f8fafc', width: '36px' }}>{progressPercent}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button onClick={() => handleUpdateSpkStatus(order.id, 'IN_PROGRESS')} style={{ padding: '5px 10px', background: order.status === 'IN_PROGRESS' ? '#1d4ed8' : '#1e293b', color: '#ffffff', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>⚙️ In Progress</button>
                              <button onClick={() => handleSubmitForQc(order.id)} style={{ padding: '5px 10px', background: order.status === 'QC' ? '#6d28d9' : '#1e293b', color: '#ffffff', border: '1px solid #8b5cf6', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>🔍 Ajukan QC</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LEVEL 4: BUKTI PEKERJAAN & QC */}
            <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#3b82f6' }}>
                Bukti Pengerjaan
              </h2>

              <form onSubmit={handleAddEvidence} style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px 0' }}>
                  Unggah Foto Bukti Hasil Kerja
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>No. SPK (Opsional)</label>
                    <input
                      type="text"
                      value={evidenceSpkId}
                      onChange={(e) => setEvidenceSpkId(e.target.value)}
                      placeholder="Contoh: SO-2026-001"
                      style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '4px' }}>Keterangan / Deskripsi Foto Bukti</label>
                    <input
                      type="text"
                      value={evidenceDescription}
                      onChange={(e) => setEvidenceDescription(e.target.value)}
                      placeholder="Deskripsi pengerjaan yang diselesaikan"
                      style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                </div>
                <button type="submit" style={{ padding: '8px 16px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  + Unggah Foto Bukti & Ajukan ke KC
                </button>
              </form>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ padding: '10px' }}>ID Bukti</th>
                    <th style={{ padding: '10px' }}>No. SPK</th>
                    <th style={{ padding: '10px' }}>Deskripsi Hasil Kerja</th>
                    <th style={{ padding: '10px' }}>Waktu</th>
                    <th style={{ padding: '10px' }}>Status Verifikasi KC</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceList.map((evd) => (
                    <tr key={evd.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{evd.id}</td>
                      <td style={{ padding: '10px', fontWeight: 'bold' }}>{evd.spkId}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>{evd.description}</td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>{evd.timestamp}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#78350f', color: '#fef3c7' }}>
                          Menunggu Verifikasi KC
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* SECTION: KOMUNIKASI */}
        {activeSection === 'KOMUNIKASI' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 16px 0' }}>
              Retensi & Komunikasi Pelanggan
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>Pesan Sapaan Pelanggan</h3>
                <button onClick={() => alert('Sapaan pelanggan dikirim via WhatsApp')} style={{ width: '100%', padding: '8px', background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Kirim Sapaan Pelanggan</button>
              </div>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>Broadcast Camera</h3>
                <button onClick={() => setShowBroadcastModal(true)} style={{ width: '100%', padding: '8px', background: '#F26522', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Buka Broadcast Camera</button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION: PRESENSI */}
        {activeSection === 'PRESENSI' && (
          <PresensiModule
            businessId={businessId}
            branchId={branchId}
            actorUserId={actorUserId}
            actorRole="PEGAWAI"
            actorName={actorName}
          />
        )}
      </main>
    </div>
  );
}
