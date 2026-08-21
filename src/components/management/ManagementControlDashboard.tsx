'use client';

import React, { useState } from 'react';
import {
  useManagementSummary,
  useUnassignedActionPlans,
  useOverdueActionPlans,
  usePendingEvidences,
  usePendingResults,
  useMissedTargetEvaluations,
  useTechnicalOutboxFailures,
} from '../../domains/management/useManagementQueries';
import { ManagementRole } from '../../domains/management/managementAuthorization';

interface ManagementControlDashboardProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorRole: ManagementRole;
  currentDate?: string;
}

export function ManagementControlDashboard({
  businessId,
  branchId,
  actorUserId,
  actorRole,
  currentDate = new Date().toISOString().substring(0, 10),
}: ManagementControlDashboardProps) {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'UNASSIGNED' | 'OVERDUE' | 'EVIDENCES' | 'RESULTS' | 'MISSED_TARGETS' | 'OUTBOX_FAILURES'>('SUMMARY');

  const { summary, loading: summaryLoading, refresh: refreshSummary } = useManagementSummary(businessId, branchId, currentDate);
  const { items: unassignedItems, assignAction } = useUnassignedActionPlans(businessId, branchId);
  const { items: overdueItems, reassignAction, logProgress } = useOverdueActionPlans(businessId, branchId, currentDate);
  const { items: pendingEvidenceItems, verifyEvidence, rejectEvidence } = usePendingEvidences(businessId, branchId);
  const { items: pendingResultItems, verifyResult } = usePendingResults(businessId, branchId);
  const { items: missedTargetItems, createCorrectiveAction } = useMissedTargetEvaluations(businessId, branchId);
  const { items: outboxFailures } = useTechnicalOutboxFailures(businessId);

  // Command Action State Handlers
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAssignAction = async (planId: string, branchIdStr: string) => {
    const executorId = prompt('Masukkan ID / Nama Staf Penanggung Jawab:');
    if (!executorId) return;
    try {
      await assignAction({
        command_id: `cmd-asg-${Date.now()}`,
        action_plan_id: planId,
        assigned_executor_user_id: executorId,
        actor_user_id: actorUserId,
        actor_role: actorRole,
        branch_id: branchIdStr,
      });
      setActionMessage({ type: 'success', text: `Tugas '${planId}' berhasil didisposisikan ke staf '${executorId}'.` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleReassignAction = async (assignmentId: string) => {
    const newExecutorId = prompt('Masukkan ID / Nama Staf Pengganti:');
    if (!newExecutorId) return;
    try {
      await reassignAction({
        command_id: `cmd-reasg-${Date.now()}`,
        assignment_id: assignmentId,
        new_executor_user_id: newExecutorId,
        actor_user_id: actorUserId,
        actor_role: actorRole,
      });
      setActionMessage({ type: 'success', text: `Tugas berhasil di-dialihkan ke staf '${newExecutorId}'.` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleLogProgress = async (planId: string) => {
    const percentStr = prompt('Masukkan Persentase Progress Pengerjaan (0-100):');
    if (percentStr === null) return;
    const percent = parseInt(percentStr, 10);
    const notes = prompt('Catatan Pengerjaan (opsional):') || undefined;

    try {
      await logProgress({
        command_id: `cmd-log-${Date.now()}`,
        action_plan_id: planId,
        progress_percent: percent,
        notes: notes,
        actor_user_id: actorUserId,
        actor_role: actorRole,
      });
      setActionMessage({ type: 'success', text: `Progress pengerjaan (${percent}%) berhasil dicatat.` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyEvidence = async (evidenceId: string) => {
    try {
      await verifyEvidence({
        command_id: `cmd-vevd-${Date.now()}`,
        evidence_id: evidenceId,
        actor_user_id: actorUserId,
        actor_role: actorRole,
      });
      setActionMessage({ type: 'success', text: `Foto bukti pengerjaan '${evidenceId}' berhasil diverifikasi (ACC).` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleRejectEvidence = async (evidenceId: string) => {
    const reason = prompt('Masukkan Alasan Penolakan Foto Bukti:');
    if (!reason) return;
    try {
      await rejectEvidence({
        command_id: `cmd-revd-${Date.now()}`,
        evidence_id: evidenceId,
        rejection_reason: reason,
        actor_user_id: actorUserId,
        actor_role: actorRole,
      });
      setActionMessage({ type: 'success', text: `Foto bukti pengerjaan '${evidenceId}' telah ditolak.` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleVerifyResult = async (resultId: string) => {
    try {
      await verifyResult({
        command_id: `cmd-vres-${Date.now()}`,
        result_id: resultId,
        actor_user_id: actorUserId,
        actor_role: actorRole,
      });
      setActionMessage({ type: 'success', text: `Hasil inspeksi kualitas '${resultId}' dinyatakan Lulus QC.` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateCorrectiveAction = async (evalId: string, planBranchId: string) => {
    const problem = prompt('Masukkan Deskripsi Masalah Target:') || 'Target operasional belum tercapai';
    const reason = prompt('Masukkan Penyebab Utama:') || 'Diperlukan penyesuaian strategi pengerjaan';
    const action = prompt('Masukkan Rencana Peningkatan:') || 'Tingkatkan pengawasan dan efisiensi tim';

    try {
      await createCorrectiveAction({
        command_id: `cmd-ca-${Date.now()}`,
        source_evaluation_id: evalId,
        branch_id: planBranchId,
        actor_user_id: actorUserId,
        actor_role: actorRole,
        business_problem: problem,
        business_reason: reason,
        proposed_action: action,
        accountable_owner_user_id: actorUserId,
        target_description: 'Mencapai target operasional pada periode berikutnya',
        expected_result_description: 'Pemulihan performa cabang',
        expected_metric_name: 'Tingkat Pencapaian Target',
        baseline_value: 0,
        target_value: 100,
        metric_unit: '%',
        start_date: currentDate,
        due_date: new Date(Date.now() + 14 * 86400000).toISOString().substring(0, 10),
      });
      setActionMessage({ type: 'success', text: `Rencana Tindakan Korektif (Action Plan) berhasil dibuat.` });
      refreshSummary();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '24px', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Pusat Pengawasan & Kendali Operasional Cabang
          </h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Peran Aktif: </span>
          <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1e293b', border: '1px solid #475569' }}>
            {actorRole === 'KEPALA_CABANG' ? 'KEPALA CABANG' : actorRole === 'OWNER' ? 'OWNER (PEMILIK USAHA)' : 'PEGAWAI'}
          </span>
        </div>
      </div>

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

      {/* Summary Stat Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div onClick={() => setActiveTab('UNASSIGNED')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>1. BELUM ADA PIC</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f59e0b', margin: '8px 0 4px 0' }}>{summary.unassigned_plans_count}</div>
          <div style={{ fontSize: '11px', color: '#38bdf8' }}>Disposisi Staf</div>
        </div>

        <div onClick={() => setActiveTab('OVERDUE')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>2. TERLAMBAT (SLA)</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ef4444', margin: '8px 0 4px 0' }}>{summary.overdue_plans_count}</div>
          <div style={{ fontSize: '11px', color: '#ef4444' }}>Perlu Peringatan</div>
        </div>

        <div onClick={() => setActiveTab('EVIDENCES')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>3. VERIFIKASI FOTO</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6', margin: '8px 0 4px 0' }}>{summary.pending_evidences_count}</div>
          <div style={{ fontSize: '11px', color: '#3b82f6' }}>ACC Bukti Kerja</div>
        </div>

        <div onClick={() => setActiveTab('RESULTS')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>4. INSPEKSI QC</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6', margin: '8px 0 4px 0' }}>{summary.pending_results_count}</div>
          <div style={{ fontSize: '11px', color: '#8b5cf6' }}>Uji Kualitas</div>
        </div>

        <div onClick={() => setActiveTab('MISSED_TARGETS')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>5. TARGET MELESET</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ec4899', margin: '8px 0 4px 0' }}>{summary.missed_target_evaluations_count}</div>
          <div style={{ fontSize: '11px', color: '#ec4899' }}>Rencana Tindakan</div>
        </div>

        <div onClick={() => setActiveTab('OUTBOX_FAILURES')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>6. AUDIT PESAN WA</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#f43f5e', margin: '8px 0 4px 0' }}>{summary.technical_outbox_failures_count}</div>
          <div style={{ fontSize: '11px', color: '#f43f5e' }}>Status Pengiriman</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid #334155', gap: '8px', marginBottom: '24px' }}>
        {[
          { id: 'SUMMARY', label: 'Ringkasan Eksekutif' },
          { id: 'UNASSIGNED', label: `Belum Ada PIC (${summary.unassigned_plans_count})` },
          { id: 'OVERDUE', label: `SLA Terlambat (${summary.overdue_plans_count})` },
          { id: 'EVIDENCES', label: `Foto Bukti (${summary.pending_evidences_count})` },
          { id: 'RESULTS', label: `Inspeksi QC (${summary.pending_results_count})` },
          { id: 'MISSED_TARGETS', label: `Target Meleset (${summary.missed_target_evaluations_count})` },
          { id: 'OUTBOX_FAILURES', label: `Audit Pesan WA (${summary.technical_outbox_failures_count})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600,
              color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
              borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT AREAS */}
      {activeTab === 'SUMMARY' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', margin: '0 0 16px 0', color: '#38bdf8' }}>Status Pengawasan & Kendali Operasional Cabang</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
            <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#fbbf24' }}>📋 Prosedur Pengawasan Kepala Cabang & Owner</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.8 }}>
                <li><strong>Disposisi Staf:</strong> Menugaskan teknisi/staf penanggung jawab untuk setiap Nota SPK yang baru masuk.</li>
                <li><strong>Monitoring SLA:</strong> Memastikan pengerjaan tidak melebihi estimasi durasi target pengerjaan cabang.</li>
                <li><strong>Verifikasi Foto Bukti:</strong> Memeriksa dan menyetujui foto hasil pengerjaan staf sebelum rilis ke pelanggan.</li>
                <li><strong>Uji Kualitas (QC Pass):</strong> Melakukan pengecekan mutu fisik layanan sebelum rilis nota akhir.</li>
              </ul>
            </div>

            <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#38bdf8' }}>⚙️ Aliran Data Closed-Loop Real-Time</h3>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#cbd5e1', fontSize: '13px', lineHeight: 1.8 }}>
                <li>Setiap pengerjaan yang di-update oleh Pegawai langsung terhubung ke dashboard pengawasan ini.</li>
                <li>Tugas tanpa PIC atau pengerjaan terlambat dapat langsung di-re-alokasikan secara instan.</li>
                <li>Pesan WA Reminder yang terkendala dapat di-retry langsung dari audit outbox pengiriman.</li>
                <li>Otorisasi dan persetujuan eksekutif terlindungi sesuai batasan wewenang Kepala Cabang & Owner.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 1. UNASSIGNED PLANS TAB */}
      {activeTab === 'UNASSIGNED' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#f59e0b' }}>Daftar Tugas Belum Ada Penanggung Jawab (PIC)</h2>
          {unassignedItems.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Semua tugas operasional telah memiliki penanggung jawab (PIC).</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>ID Plan</th>
                  <th style={{ padding: '10px' }}>Masalah / Rencana Pengerjaan</th>
                  <th style={{ padding: '10px' }}>Pembuat</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {unassignedItems.map(({ action_plan: plan }) => (
                  <tr key={plan.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{plan.id}</td>
                    <td style={{ padding: '10px' }}>{plan.proposed_action}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{plan.maker_user_id}</td>
                    <td style={{ padding: '10px' }}><span style={{ padding: '2px 6px', background: '#3b82f6', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{plan.status}</span></td>
                    <td style={{ padding: '10px' }}>
                      {['OWNER', 'KEPALA_CABANG'].includes(actorRole) ? (
                        <button
                          onClick={() => handleAssignAction(plan.id, plan.branch_id)}
                          style={{ padding: '6px 12px', background: '#059669', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          + Tugaskan Staf
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Khusus Manager</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 2. OVERDUE PLANS TAB */}
      {activeTab === 'OVERDUE' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#ef4444' }}>Daftar Pengerjaan Terlambat (Overdue SLA)</h2>
          {overdueItems.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada pengerjaan yang terlambat. Waktu pengerjaan tim berjalan sesuai target SLA.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>ID Plan</th>
                  <th style={{ padding: '10px' }}>Rencana Pengerjaan</th>
                  <th style={{ padding: '10px' }}>Target Selesai</th>
                  <th style={{ padding: '10px' }}>Keterlambatan</th>
                  <th style={{ padding: '10px' }}>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {overdueItems.map(({ action_plan: plan, days_overdue }) => (
                  <tr key={plan.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{plan.id}</td>
                    <td style={{ padding: '10px' }}>{plan.proposed_action}</td>
                    <td style={{ padding: '10px', color: '#fca5a5' }}>{plan.due_date}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#ef4444' }}>+{days_overdue} hari</td>
                    <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                      {['OWNER', 'KEPALA_CABANG'].includes(actorRole) && (
                        <button
                          onClick={() => handleReassignAction(plan.id)}
                          style={{ padding: '6px 10px', background: '#d97706', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          Re-Alokasi PIC
                        </button>
                      )}
                      {['PEGAWAI', 'KEPALA_CABANG'].includes(actorRole) && (
                        <button
                          onClick={() => handleLogProgress(plan.id)}
                          style={{ padding: '6px 10px', background: '#2563eb', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          Catat Progress
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 3. PENDING EVIDENCES TAB */}
      {activeTab === 'EVIDENCES' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#3b82f6' }}>Daftar Foto Bukti Pengerjaan Menunggu Verifikasi (ACC)</h2>
          {pendingEvidenceItems.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada foto bukti pengerjaan yang menunggu verifikasi saat ini.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>ID Bukti</th>
                  <th style={{ padding: '10px' }}>ID Plan</th>
                  <th style={{ padding: '10px' }}>Pengirim Staf</th>
                  <th style={{ padding: '10px' }}>Keterangan Hasil</th>
                  <th style={{ padding: '10px' }}>Tindakan Otorisasi</th>
                </tr>
              </thead>
              <tbody>
                {pendingEvidenceItems.map(({ evidence: evd }) => (
                  <tr key={evd.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{evd.id}</td>
                    <td style={{ padding: '10px', fontFamily: 'monospace' }}>{evd.action_plan_id}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{evd.submitted_by_user_id}</td>
                    <td style={{ padding: '10px' }}>{evd.description}</td>
                    <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                      {['OWNER', 'KEPALA_CABANG'].includes(actorRole) ? (
                        <>
                          <button
                            onClick={() => handleVerifyEvidence(evd.id)}
                            style={{ padding: '6px 10px', background: '#059669', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            ✓ ACC Foto Bukti
                          </button>
                          <button
                            onClick={() => handleRejectEvidence(evd.id)}
                            style={{ padding: '6px 10px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                          >
                            ✕ Tolak
                          </button>
                        </>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Khusus Manager</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 4. PENDING RESULTS TAB */}
      {activeTab === 'RESULTS' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#8b5cf6' }}>Daftar Hasil Layanan Menunggu Inspeksi Kualitas (QC)</h2>
          {pendingResultItems.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada hasil pengerjaan yang menunggu inspeksi QC saat ini.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>ID Hasil</th>
                  <th style={{ padding: '10px' }}>Metrik Kualitas</th>
                  <th style={{ padding: '10px' }}>Baseline / Target</th>
                  <th style={{ padding: '10px' }}>Hasil Aktual</th>
                  <th style={{ padding: '10px' }}>Tindakan QC</th>
                </tr>
              </thead>
              <tbody>
                {pendingResultItems.map(({ result: res }) => (
                  <tr key={res.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{res.id}</td>
                    <td style={{ padding: '10px' }}>{res.metric_name_snapshot}</td>
                    <td style={{ padding: '10px', color: '#94a3b8' }}>{res.baseline_value_snapshot} / {res.target_value_snapshot} {res.metric_unit}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#a7f3d0' }}>{res.actual_value} {res.metric_unit}</td>
                    <td style={{ padding: '10px' }}>
                      {['OWNER', 'KEPALA_CABANG'].includes(actorRole) ? (
                        <button
                          onClick={() => handleVerifyResult(res.id)}
                          style={{ padding: '6px 12px', background: '#7c3aed', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          ✓ Lulus QC
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Khusus Manager</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 5. MISSED TARGET EVALUATIONS TAB */}
      {activeTab === 'MISSED_TARGETS' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#ec4899' }}>Evaluasi Target Operasional Belum Tercapai (Action Plan Candidates)</h2>
          {missedTargetItems.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Semua target evaluasi operasional cabang tercapai dengan baik.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>ID Evaluasi</th>
                  <th style={{ padding: '10px' }}>Hasil Evaluasi</th>
                  <th style={{ padding: '10px' }}>Catatan Kendala</th>
                  <th style={{ padding: '10px' }}>Tindakan Korektif</th>
                </tr>
              </thead>
              <tbody>
                {missedTargetItems.map(({ evaluation: evalRec }) => (
                  <tr key={evalRec.id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{evalRec.id}</td>
                    <td style={{ padding: '10px' }}><span style={{ padding: '2px 8px', background: '#be123c', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>{evalRec.evaluation_outcome}</span></td>
                    <td style={{ padding: '10px', color: '#cbd5e1' }}>{evalRec.evaluation_notes}</td>
                    <td style={{ padding: '10px' }}>
                      {actorRole === 'KEPALA_CABANG' || actorRole === 'OWNER' ? (
                        <button
                          onClick={() => handleCreateCorrectiveAction(evalRec.id, evalRec.branch_id)}
                          style={{ padding: '6px 12px', background: '#be185d', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
                        >
                          + Buat Action Plan
                        </button>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '12px' }}>Khusus Manager</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* 6. OUTBOX FAILURES TAB */}
      {activeTab === 'OUTBOX_FAILURES' && (
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
          <h2 style={{ fontSize: '16px', margin: '0 0 16px 0', color: '#f43f5e' }}>Audit Log Pengiriman Pesan WA & Notifikasi Terkendala</h2>
          {outboxFailures.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '13px' }}>Semua pengiriman notifikasi dan pesan WA berjalan lancar tanpa kendala.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>ID Event</th>
                  <th style={{ padding: '10px' }}>Tipe Notifikasi</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Rincian Kendala</th>
                  <th style={{ padding: '10px' }}>Status Retry</th>
                </tr>
              </thead>
              <tbody>
                {outboxFailures.map((fail) => (
                  <tr key={fail.outbox_event_id} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px', fontFamily: 'monospace', color: '#f43f5e' }}>{fail.outbox_event_id}</td>
                    <td style={{ padding: '10px' }}>{fail.event_type}</td>
                    <td style={{ padding: '10px' }}><span style={{ padding: '2px 8px', background: '#9f1239', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>{fail.status}</span></td>
                    <td style={{ padding: '10px', color: '#fca5a5' }}>{fail.error_message} (Percobaan: {fail.retry_count}x)</td>
                    <td style={{ padding: '10px', color: '#64748b', fontSize: '12px' }}>Sistem Otomatis Mengulang Pengiriman</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
