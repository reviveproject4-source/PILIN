'use client';

import React, { useState, useEffect } from 'react';
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

import { BroadcastCameraModal } from '../broadcast/BroadcastCameraModal';

import { ServiceOrderStatus } from '@/lib/types';
import { WorkQueueService, WorkOrderQueueItem } from '@/domains/work/workQueueService';
import { ExpenseDomainService, ExpenseRecord } from '@/domains/finance/expenseService';
import { RetentionDomainService, SapaanLogRecord } from '@/domains/retention/retentionDomainService';
import { CustomerDomainService } from '@/domains/customer/customerService';
import { GamificationDomainService, PerformanceRecord } from '@/domains/intelligence/gamificationDomainService';
import { PeopleRepository } from '@/domains/people/peopleRepository';
import { Employee } from '@/domains/people/people.types';

interface ManagementControlDashboardProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorRole: ManagementRole;
  currentDate?: string;
}

export function ManagementControlDashboard({
  businessId,
  branchId = 'branch-001',
  actorUserId,
  actorRole,
  currentDate = new Date().toISOString().substring(0, 10),
}: ManagementControlDashboardProps) {
  const [activeSection, setActiveSection] = useState<
    'PUSAT_KENDALI' | 'PERSETUJUAN_KASIR' | 'ANTRIAN_SPK' | 'PRESENSI_TIM' | 'RETENSI_PELANGGAN' | 'PENGELUARAN_CABANG'
  >('PUSAT_KENDALI');
  const [activeTab, setActiveTab] = useState<
    'SPK_QUEUE' | 'UNASSIGNED' | 'OVERDUE' | 'EVIDENCES' | 'RESULTS' | 'MISSED_TARGETS' | 'OUTBOX_FAILURES' | 'GAMIFIKASI'
  >('SPK_QUEUE');
  const [showBroadcastModal, setShowBroadcastModal] = useState<boolean>(false);
  const [spkOrders, setSpkOrders] = useState<WorkOrderQueueItem[]>(() => WorkQueueService.getOrders(branchId));

  // Domain Queries
  const { summary, loading: summaryLoading, refresh: refreshSummary } = useManagementSummary(businessId, branchId, currentDate);
  const { items: unassignedItems, assignAction } = useUnassignedActionPlans(businessId, branchId);
  const { items: overdueItems, reassignAction, logProgress } = useOverdueActionPlans(businessId, branchId, currentDate);
  const { items: pendingEvidenceItems, verifyEvidence, rejectEvidence } = usePendingEvidences(businessId, branchId);
  const { items: pendingResultItems, verifyResult } = usePendingResults(businessId, branchId);
  const { items: missedTargetItems, createCorrectiveAction } = useMissedTargetEvaluations(businessId, branchId);
  const { items: outboxFailures } = useTechnicalOutboxFailures(businessId);

  // Cashier Approvals State (Diskon Khusus & Pembatalan Nota)
  const [pendingDiscounts, setPendingDiscounts] = useState([
    { id: 'disc-01', cashierName: 'Siti Rahma', notaNumber: 'NOT-2026-0891', originalTotal: 350000, requestedPercent: 15, requestedAmount: 52500, time: '10:15 WIB' },
  ]);
  const [pendingCancellations, setPendingCancellations] = useState([
    { id: 'canc-01', cashierName: 'Budi Santoso', notaNumber: 'NOT-2026-0885', originalTotal: 120000, reason: 'Pelanggan membatalkan pesanan sebelum pengerjaan', time: '09:40 WIB' },
  ]);

  // Gamification State
  const [gamificationRecords] = useState<PerformanceRecord[]>(() => GamificationDomainService.getRecords());
  const [branchGamificationTier] = useState(() => {
    const totalRev = (spkOrders.length + 15) * 50000;
    return GamificationDomainService.calculateTier(spkOrders.length + 15, totalRev, 8);
  });

  // Dormant Customers State (>60 Days)
  const [dormantCustomers, setDormantCustomers] = useState<{ id: string; nama: string; no_hp: string; recencyDays: number; status: string }[]>([]);

  // WA Engine Logs & Template State
  const [waLogs, setWaLogs] = useState<SapaanLogRecord[]>(() => RetentionDomainService.getSapaanLogs());
  const [selectedWaCustomerPhone, setSelectedWaCustomerPhone] = useState<string>('08212345678');
  const [selectedWaCustomerName, setSelectedWaCustomerName] = useState<string>('Dewi Lestari');
  const [waCategoryKC, setWaCategoryKC] = useState<'SAPAAN' | 'REMINDER' | 'QUOTE' | 'HYPPOSELLING'>('HYPPOSELLING');
  const [customMessageKC, setCustomMessageKC] = useState<string>(
    'Halo Kak Dewi Lestari! Khusus pelanggan setia cabang kami, nikmati promo spesial perawatan terbatas minggu ini. Balas pesan ini untuk info promo!'
  );

  // Team Presensi State
  const [teamEmployees, setTeamEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load Dormant Customers (>60 Days)
        const customers = CustomerDomainService.getCustomers();
        const mapped = customers.map(c => {
          const lastVisitDate = c.updated_at ? new Date(c.updated_at) : new Date(Date.now() - 75 * 86400000);
          const recencyDays = Math.floor((Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: c.id,
            nama: c.nama,
            no_hp: c.no_hp || '08123456789',
            recencyDays: recencyDays > 0 ? recencyDays : 65,
            status: c.status || 'AT_RISK',
          };
        });
        const inactive = mapped.filter(c => c.recencyDays >= 60);
        if (inactive.length === 0) {
          setDormantCustomers([
            { id: 'cust-104', nama: 'Dewi Lestari', no_hp: '08212345678', recencyDays: 95, status: 'AT_RISK' },
            { id: 'cust-105', nama: 'Rudi Hermawan', no_hp: '08134567890', recencyDays: 72, status: 'DORMANT' },
            { id: 'cust-106', nama: 'Maya Indah', no_hp: '08571234567', recencyDays: 64, status: 'AT_RISK' },
          ]);
        } else {
          setDormantCustomers(inactive);
        }

        // Load Team Employees
        const list = await PeopleRepository.listEmployees(businessId);
        if (list && list.length > 0) {
          setTeamEmployees(list);
        }
      } catch (err) {
        console.error('Failed to load KC domain data', err);
      }
    }
    loadData();
  }, [businessId]);

  const refreshWaLogs = () => {
    setWaLogs(RetentionDomainService.getSapaanLogs());
  };

  const handleMandateWaFromKC = (customerName: string, phone: string, category: 'SAPAAN' | 'REMINDER' | 'QUOTE' | 'HYPPOSELLING', customText?: string) => {
    let messageText = customText || '';
    if (!messageText) {
      if (category === 'SAPAAN') {
        messageText = `Halo Kak ${customerName}, terima kasih telah mempercayakan pengerjaan barang Anda pada cabang kami. Bagaimana kabar pengerjaan tim kami? Salam hangat dari tim PILIN ERP!`;
      } else if (category === 'REMINDER') {
        messageText = `Halo Kak ${customerName}, pengingat ramah dari tim PILIN ERP. Waktunya perawatan rutin untuk barang kesayangan Anda agar tetap optimal!`;
      } else if (category === 'QUOTE') {
        messageText = `Halo Kak ${customerName}, "Kebersihan dan kerapihan adalah cermin kenyamanan." Selamat beraktivitas dari tim PILIN ERP!`;
      } else {
        messageText = `Halo Kak ${customerName}! Khusus pelanggan langganan cabang kami, kami memberikan penawaran khusus promo re-engage terbatas. Klaim diskon 20% hari ini!`;
      }
    }

    RetentionDomainService.createMandateByKC({
      customer_name: customerName,
      customer_phone: phone,
      category: category,
      message_text: messageText,
    });

    refreshWaLogs();
    setActionMessage({ type: 'success', text: `Mandat Pengiriman WA (${category}) untuk ${customerName} berhasil diteruskan ke Kasir Operasional.` });
  };

  // Happy Hour State
  const [happyHourActive, setHappyHourActive] = useState<boolean>(false);
  const [happyHourPercent, setHappyHourPercent] = useState<number>(15);

  // Expense State
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => ExpenseDomainService.getExpenses());
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord['category']>('OPERATIONAL');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Notification Banner
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Calculations
  const pendingApprovalsCount = pendingDiscounts.length + pendingCancellations.length + expenses.filter(e => e.status === 'PENDING_APPROVAL').length;
  const hasActions = pendingApprovalsCount > 0 || summary.unassigned_plans_count > 0 || summary.overdue_plans_count > 0 || summary.pending_evidences_count > 0 || summary.pending_results_count > 0 || summary.missed_target_evaluations_count > 0 || outboxFailures.length > 0;

  const refreshSpkOrders = () => {
    setSpkOrders(WorkQueueService.getOrders(branchId));
  };

  const handleUpdateSpkStatus = (spkId: string, newStatus: ServiceOrderStatus) => {
    const res = WorkQueueService.updateOrderStatus(spkId, newStatus, actorUserId);
    if (res.success) {
      setActionMessage({ type: 'success', text: res.message });
      refreshSpkOrders();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const handleUpdateOrderQC = (spkId: string, qcStatus: 'PASSED' | 'FAILED') => {
    const res = WorkQueueService.updateOrderQC(spkId, qcStatus);
    if (res.success) {
      if (qcStatus === 'PASSED') {
        WorkQueueService.updateOrderStatus(spkId, 'READY_FOR_PICKUP', actorUserId);
        setActionMessage({ type: 'success', text: `SPK ${spkId} LULUS QC! Status diperbarui ke READY FOR PICKUP.` });
      } else {
        setActionMessage({ type: 'error', text: `SPK ${spkId} GAGAL QC. SPK dikembalikan ke Tim Produksi.` });
      }
      refreshSpkOrders();
    } else {
      setActionMessage({ type: 'error', text: res.message });
    }
  };

  const overdueSpkOrders = spkOrders.filter(o => 
    o.elapsed_minutes > o.target_minutes && 
    o.status !== 'READY_FOR_PICKUP' && 
    o.status !== 'DELIVERED' && 
    o.status !== 'CLOSED' && 
    o.status !== 'CANCELLED'
  );
  const totalOverdueCount = overdueSpkOrders.length + (summary?.overdue_plans_count || 0);

  const handleApproveDiscount = (id: string) => {
    setPendingDiscounts(prev => prev.filter(item => item.id !== id));
    setActionMessage({ type: 'success', text: 'Permintaan Diskon Khusus berhasil disetujui.' });
  };

  const handleRejectDiscount = (id: string) => {
    setPendingDiscounts(prev => prev.filter(item => item.id !== id));
    setActionMessage({ type: 'error', text: 'Permintaan Diskon Khusus ditolak.' });
  };

  const handleApproveCancellation = (id: string) => {
    setPendingCancellations(prev => prev.filter(item => item.id !== id));
    setActionMessage({ type: 'success', text: 'Permintaan Pembatalan Nota berhasil disetujui.' });
  };

  const handleRejectCancellation = (id: string) => {
    setPendingCancellations(prev => prev.filter(item => item.id !== id));
    setActionMessage({ type: 'error', text: 'Permintaan Pembatalan Nota ditolak.' });
  };

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
      setActionMessage({ type: 'success', text: `Tugas berhasil dialihkan ke staf '${newExecutorId}'.` });
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

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setActionMessage({ type: 'error', text: 'Nominal pengeluaran harus lebih dari 0.' });
      return;
    }

    try {
      ExpenseDomainService.recordExpense({
        category: expenseCategory,
        amount: amountNum,
        notes: expenseNotes,
        created_by: actorUserId,
        created_by_role: actorRole,
      });
      setExpenses(ExpenseDomainService.getExpenses());
      setExpenseAmount('');
      setExpenseNotes('');
      setActionMessage({ type: 'success', text: 'Pengeluaran cabang berhasil dicatat.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  const handleApproveExpense = (id: string) => {
    try {
      ExpenseDomainService.approveExpense(id, actorRole, actorUserId);
      setExpenses(ExpenseDomainService.getExpenses());
      setActionMessage({ type: 'success', text: 'Pengeluaran cabang telah disetujui.' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-200">
      {/* SIDEBAR NAVIGATION — OFFICIAL IA FOR KEPALA CABANG */}
      <aside className="w-64 bg-white dark:bg-[#0b172a] text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-6 shrink-0 hidden lg:flex transition-colors">
        <div>
          <div className="text-[11px] font-extrabold text-[#F26522] tracking-wider mb-1">KEPALA CABANG</div>
          <div className="text-base font-black text-slate-900 dark:text-white">Pusat Kendali Operasional</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* PUSAT KENDALI */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>PUSAT KENDALI</div>
            <button
              onClick={() => setActiveSection('PUSAT_KENDALI')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeSection === 'PUSAT_KENDALI' ? '#2563eb' : 'transparent',
                color: activeSection === 'PUSAT_KENDALI' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Pusat Kendali Operasional
            </button>
          </div>

          {/* TRANSAKSI */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>TRANSAKSI</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => setActiveSection('PERSETUJUAN_KASIR')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: activeSection === 'PERSETUJUAN_KASIR' ? '#2563eb' : 'transparent',
                  color: activeSection === 'PERSETUJUAN_KASIR' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>Persetujuan Kasir</span>
                {pendingDiscounts.length + pendingCancellations.length > 0 && (
                  <span style={{ backgroundColor: '#ef4444', color: '#ffffff', borderRadius: '9999px', padding: '1px 6px', fontSize: '10px', fontWeight: 800 }}>
                    🔴 {pendingDiscounts.length + pendingCancellations.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* OPERASIONAL */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>OPERASIONAL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <button
                onClick={() => setActiveSection('PRESENSI_TIM')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: activeSection === 'PRESENSI_TIM' ? '#2563eb' : 'transparent',
                  color: activeSection === 'PRESENSI_TIM' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Presensi & Tim Cabang
              </button>
              <button
                onClick={() => setActiveSection('ANTRIAN_SPK')}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: activeSection === 'ANTRIAN_SPK' ? '#2563eb' : 'transparent',
                  color: activeSection === 'ANTRIAN_SPK' ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Antrian & Pengerjaan SPK
              </button>
            </div>
          </div>

          {/* PELANGGAN */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>PELANGGAN</div>
            <button
              onClick={() => setActiveSection('RETENSI_PELANGGAN')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeSection === 'RETENSI_PELANGGAN' ? '#2563eb' : 'transparent',
                color: activeSection === 'RETENSI_PELANGGAN' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Retensi & Komunikasi Pelanggan
            </button>
          </div>

          {/* KEUANGAN */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>KEUANGAN</div>
            <button
              onClick={() => setActiveSection('PENGELUARAN_CABANG')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: activeSection === 'PENGELUARAN_CABANG' ? '#2563eb' : 'transparent',
                color: activeSection === 'PENGELUARAN_CABANG' ? '#ffffff' : '#94a3b8',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Pengeluaran & Keuangan Cabang
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#f8fafc' }}>
              Pusat Pengawasan & Kendali Operasional Cabang
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
              <span style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 'bold', padding: '3px 10px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #475569' }}>
                KEPALA CABANG
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

        {/* LEVEL 1: KONDISI CABANG HARI INI (Stat Metric Grid) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Omzet Hari Ini</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', margin: '8px 0 0 0' }}>Rp 4.250.000</div>
          </div>

          <div onClick={() => setActiveSection('ANTRIAN_SPK')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>SPK Dalam Pengerjaan</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#F26522', margin: '8px 0 0 0' }}>{spkOrders.length}</div>
          </div>

          <div onClick={() => setActiveSection('PERSETUJUAN_KASIR')} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              {pendingApprovalsCount > 0 ? '🔴 Persetujuan Menunggu' : 'Persetujuan Menunggu'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: pendingApprovalsCount > 0 ? '#ef4444' : '#f8fafc', margin: '8px 0 0 0' }}>
              {pendingApprovalsCount}
            </div>
          </div>

          <div onClick={() => { setActiveSection('PUSAT_KENDALI'); setActiveTab('OVERDUE'); }} style={{ padding: '16px', borderRadius: '12px', background: '#1e293b', border: '1px solid #334155', cursor: 'pointer' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
              {totalOverdueCount > 0 ? '⚠️ SPK Terlambat (SLA)' : 'SPK Terlambat (SLA)'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: totalOverdueCount > 0 ? '#ef4444' : '#f8fafc', margin: '8px 0 0 0' }}>
              {totalOverdueCount}
            </div>
          </div>
        </div>

        {/* LEVEL 2: YANG MEMBUTUHKAN TINDAKAN (ACTION REQUIRED AREA) */}
        <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', marginBottom: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fbbf24', margin: '0 0 16px 0' }}>
            Yang Membutuhkan Tindakan
          </h2>

          {!hasActions ? (
            <div style={{ padding: '12px 16px', background: '#064e3b', border: '1px solid #059669', color: '#a7f3d0', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
              ✓ Tidak ada tindakan yang perlu dilakukan saat ini. Seluruh operasional cabang berjalan lancar.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Permintaan Diskon Khusus */}
              {pendingDiscounts.map(disc => (
                <div key={disc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', backgroundColor: '#7f1d1d', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>🔴 Permintaan Diskon Khusus</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Kasir {disc.cashierName} memohon diskon {disc.requestedPercent}% ({disc.notaNumber})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApproveDiscount(disc.id)} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Setujui Diskon</button>
                    <button onClick={() => handleRejectDiscount(disc.id)} style={{ padding: '6px 12px', background: '#dc2626', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Tolak</button>
                  </div>
                </div>
              ))}

              {/* Permintaan Pembatalan Nota */}
              {pendingCancellations.map(canc => (
                <div key={canc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', backgroundColor: '#78350f', padding: '2px 6px', borderRadius: '4px', marginRight: '8px' }}>Permintaan Pembatalan Nota</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Kasir {canc.cashierName} memohon pembatalan ({canc.notaNumber})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleApproveCancellation(canc.id)} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Setujui Pembatalan</button>
                    <button onClick={() => handleRejectCancellation(canc.id)} style={{ padding: '6px 12px', background: '#dc2626', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Tolak</button>
                  </div>
                </div>
              ))}

              {/* Belum Ada PIC */}
              {summary.unassigned_plans_count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{summary.unassigned_plans_count} Pekerjaan Belum Ada PIC</span>
                  </div>
                  <button onClick={() => { setActiveSection('PUSAT_KENDALI'); setActiveTab('UNASSIGNED'); }} style={{ padding: '6px 12px', background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Disposisi Staf</button>
                </div>
              )}

              {/* SPK Terlambat (SLA) */}
              {summary.overdue_plans_count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{summary.overdue_plans_count} SPK Terlambat (SLA)</span>
                  </div>
                  <button onClick={() => { setActiveSection('PUSAT_KENDALI'); setActiveTab('OVERDUE'); }} style={{ padding: '6px 12px', background: '#d97706', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>(Penugasan Ulang)</button>
                </div>
              )}

              {/* Bukti Pengerjaan belum diverifikasi */}
              {summary.pending_evidences_count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{summary.pending_evidences_count} Bukti Pengerjaan Menunggu Verifikasi</span>
                  </div>
                  <button onClick={() => { setActiveSection('PUSAT_KENDALI'); setActiveTab('EVIDENCES'); }} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Periksa Bukti Pengerjaan</button>
                </div>
              )}

              {/* Inspeksi Kualitas (QC) menunggu */}
              {summary.pending_results_count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f172a', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>{summary.pending_results_count} Hasil Pengerjaan Menunggu Inspeksi Kualitas (QC)</span>
                  </div>
                  <button onClick={() => { setActiveSection('PUSAT_KENDALI'); setActiveTab('RESULTS'); }} style={{ padding: '6px 12px', background: '#7c3aed', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Inspeksi Kualitas (QC)</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION NAVIGATION FOR DETAILED OPERATIONAL MODULES */}
        {activeSection === 'PUSAT_KENDALI' && (
          <>
            {/* SUB TAB BAR */}
            <div style={{ display: 'flex', borderBottom: '1px solid #334155', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { id: 'SPK_QUEUE', label: `Antrian & Pengerjaan SPK (${spkOrders.length})` },
                { id: 'UNASSIGNED', label: `Belum Ada PIC (${summary.unassigned_plans_count})` },
                { id: 'OVERDUE', label: `SPK Terlambat (SLA) (${totalOverdueCount})` },
                { id: 'EVIDENCES', label: `Bukti Pengerjaan (${summary.pending_evidences_count})` },
                { id: 'RESULTS', label: `Inspeksi Kualitas (QC) (${summary.pending_results_count})` },
                { id: 'MISSED_TARGETS', label: `Target Meleset (${summary.missed_target_evaluations_count})` },
                { id: 'OUTBOX_FAILURES', label: `Pesan Gagal Terkirim (${summary.technical_outbox_failures_count})` },
                { id: 'GAMIFIKASI', label: `🏆 Gamifikasi & Poin Cabang (${gamificationRecords.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: activeTab === tab.id ? '#38bdf8' : '#94a3b8',
                    borderBottom: activeTab === tab.id ? '2px solid #38bdf8' : '2px solid transparent',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* SPK QUEUE TAB */}
            {activeTab === 'SPK_QUEUE' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#F26522' }}>
                  Antrian & Pengerjaan SPK
                </h2>

                {spkOrders.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Belum ada antrian SPK di cabang ini.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: '#0f172a' }}>
                          <th style={{ padding: '12px' }}>No. SPK</th>
                          <th style={{ padding: '12px' }}>Nama Pelanggan</th>
                          <th style={{ padding: '12px' }}>Layanan Jasa</th>
                          <th style={{ padding: '12px' }}>Teknisi / Staf</th>
                          <th style={{ padding: '12px' }}>Status & QC</th>
                          <th style={{ padding: '12px', textAlign: 'right' }}>Aksi Lifecycle & QC KC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spkOrders.map((order) => {
                          const isOverdue = order.elapsed_minutes > order.target_minutes && order.status !== 'READY_FOR_PICKUP' && order.status !== 'DELIVERED' && order.status !== 'CLOSED' && order.status !== 'CANCELLED';
                          const progressPercent =
                            order.status === 'CLOSED' || order.status === 'DELIVERED' || order.status === 'READY_FOR_PICKUP' ? 100 :
                            order.status === 'QC' ? 85 :
                            order.status === 'IN_PROGRESS' ? 50 : 25;

                          return (
                            <tr key={order.id} style={{ borderBottom: '1px solid #334155' }}>
                              <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>
                                {order.order_number}
                                {isOverdue && <span style={{ display: 'block', fontSize: '10px', color: '#ef4444', fontWeight: 'bold' }}>⚠️ SLA Overdue</span>}
                              </td>
                              <td style={{ padding: '12px', fontWeight: 'bold', color: '#f8fafc' }}>{order.customer_name}</td>
                              <td style={{ padding: '12px', color: '#cbd5e1' }}>{order.service_name}</td>
                              <td style={{ padding: '12px', color: '#94a3b8' }}>{order.worker_name || 'Staf Kasir'}</td>
                              <td style={{ padding: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#10b981' : progressPercent >= 85 ? '#8b5cf6' : progressPercent >= 50 ? '#3b82f6' : '#f59e0b' }}></div>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#f8fafc' }}>{progressPercent}%</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '4px', fontSize: '10px' }}>
                                    <span style={{ padding: '1px 6px', borderRadius: '4px', background: '#334155', color: '#f8fafc', fontWeight: 600 }}>{order.status}</span>
                                    <span style={{ padding: '1px 6px', borderRadius: '4px', background: order.qc_status === 'PASSED' ? 'rgba(16,185,129,0.2)' : order.qc_status === 'FAILED' ? 'rgba(239,68,68,0.2)' : '#334155', color: order.qc_status === 'PASSED' ? '#34d399' : order.qc_status === 'FAILED' ? '#f87171' : '#94a3b8', fontWeight: 600 }}>
                                      QC: {order.qc_status}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                  <button onClick={() => handleUpdateSpkStatus(order.id, 'IN_PROGRESS')} style={{ padding: '5px 10px', background: order.status === 'IN_PROGRESS' ? '#1d4ed8' : '#1e293b', color: '#ffffff', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>⚙️ Dalam Pengerjaan</button>
                                  <button onClick={() => handleUpdateOrderQC(order.id, 'PASSED')} style={{ padding: '5px 10px', background: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>✓ Lulus QC</button>
                                  <button onClick={() => handleUpdateOrderQC(order.id, 'FAILED')} style={{ padding: '5px 10px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>⚠️ Gagal QC</button>
                                  <button onClick={() => handleUpdateSpkStatus(order.id, 'CLOSED')} style={{ padding: '5px 10px', background: order.status === 'CLOSED' ? '#047857' : '#1e293b', color: '#ffffff', border: '1px solid #10b981', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>✓ Selesai</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* UNASSIGNED PLANS TAB */}
            {activeTab === 'UNASSIGNED' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#f59e0b' }}>
                  Belum Ada PIC
                </h2>
                {unassignedItems.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Semua tugas operasional telah memiliki penanggung jawab (PIC).</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px' }}>ID Plan</th>
                        <th style={{ padding: '10px' }}>Rencana Pengerjaan</th>
                        <th style={{ padding: '10px' }}>Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unassignedItems.map(({ action_plan: plan }) => (
                        <tr key={plan.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{plan.id}</td>
                          <td style={{ padding: '10px' }}>{plan.proposed_action}</td>
                          <td style={{ padding: '10px' }}>
                            <button onClick={() => handleAssignAction(plan.id, plan.branch_id)} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>+ Tugaskan Staf</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* OVERDUE PLANS TAB */}
            {activeTab === 'OVERDUE' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#ef4444' }}>
                  SPK Terlambat (SLA) — WorkQueueService & Action Plans
                </h2>
                {overdueSpkOrders.length === 0 && overdueItems.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada SPK yang terlambat. Waktu pengerjaan tim berjalan sesuai target SLA.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {overdueSpkOrders.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>SPK Terlambat Aktual (WorkQueueService):</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: '#0f172a' }}>
                              <th style={{ padding: '10px' }}>No. SPK</th>
                              <th style={{ padding: '10px' }}>Pelanggan</th>
                              <th style={{ padding: '10px' }}>Layanan</th>
                              <th style={{ padding: '10px' }}>Staf / PIC</th>
                              <th style={{ padding: '10px' }}>Waktu Berjalan vs SLA Target</th>
                              <th style={{ padding: '10px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overdueSpkOrders.map(order => (
                              <tr key={order.id} style={{ borderBottom: '1px solid #334155' }}>
                                <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#ef4444' }}>{order.order_number}</td>
                                <td style={{ padding: '10px', color: '#f8fafc', fontWeight: 'bold' }}>{order.customer_name}</td>
                                <td style={{ padding: '10px', color: '#cbd5e1' }}>{order.service_name}</td>
                                <td style={{ padding: '10px', color: '#94a3b8' }}>{order.worker_name}</td>
                                <td style={{ padding: '10px', color: '#ef4444', fontWeight: 'bold' }}>
                                  {order.elapsed_minutes} menit / target {order.target_minutes} menit (+{order.elapsed_minutes - order.target_minutes}m)
                                </td>
                                <td style={{ padding: '10px' }}>
                                  <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#ef4444', color: '#white', fontWeight: 700, fontSize: '11px' }}>
                                    ⚠️ TERLAMBAT ({order.status})
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {overdueItems.length > 0 && (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Action Plans Overdue:</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                              <th style={{ padding: '10px' }}>ID Plan</th>
                              <th style={{ padding: '10px' }}>Rencana Pengerjaan</th>
                              <th style={{ padding: '10px' }}>Keterlambatan</th>
                              <th style={{ padding: '10px' }}>Tindakan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overdueItems.map(({ action_plan: plan, days_overdue }) => (
                              <tr key={plan.id} style={{ borderBottom: '1px solid #334155' }}>
                                <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{plan.id}</td>
                                <td style={{ padding: '10px' }}>{plan.proposed_action}</td>
                                <td style={{ padding: '10px', fontWeight: 'bold', color: '#ef4444' }}>+{days_overdue} hari</td>
                                <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                                  <button onClick={() => handleReassignAction(plan.id)} style={{ padding: '6px 10px', background: '#d97706', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Re-Alokasi PIC</button>
                                  <button onClick={() => handleLogProgress(plan.id)} style={{ padding: '6px 10px', background: '#2563eb', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>Catat Progress</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* EVIDENCES TAB */}
            {activeTab === 'EVIDENCES' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#3b82f6' }}>
                  Bukti Pengerjaan
                </h2>
                {pendingEvidenceItems.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada foto bukti pengerjaan yang menunggu verifikasi saat ini.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px' }}>ID Bukti</th>
                        <th style={{ padding: '10px' }}>Keterangan Hasil</th>
                        <th style={{ padding: '10px' }}>Tindakan Otorisasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingEvidenceItems.map(({ evidence: evd }) => (
                        <tr key={evd.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{evd.id}</td>
                          <td style={{ padding: '10px' }}>{evd.description}</td>
                          <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleVerifyEvidence(evd.id)} style={{ padding: '6px 10px', background: '#059669', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>✓ ACC Foto Bukti</button>
                            <button onClick={() => handleRejectEvidence(evd.id)} style={{ padding: '6px 10px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>✕ Tolak</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* RESULTS TAB (INSPEKSI QC) */}
            {activeTab === 'RESULTS' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#8b5cf6' }}>
                  Inspeksi Kualitas (QC) — SPK & Action Results
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>SPK Menunggu / Verifikasi Inspeksi QC:</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: '#0f172a' }}>
                          <th style={{ padding: '10px' }}>No. SPK</th>
                          <th style={{ padding: '10px' }}>Pelanggan</th>
                          <th style={{ padding: '10px' }}>Layanan</th>
                          <th style={{ padding: '10px' }}>Staf Produksi</th>
                          <th style={{ padding: '10px' }}>Status QC</th>
                          <th style={{ padding: '10px', textAlign: 'right' }}>Aksi Verifikasi QC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spkOrders.map(order => (
                          <tr key={order.id} style={{ borderBottom: '1px solid #334155' }}>
                            <td style={{ padding: '10px', fontFamily: 'monospace', fontWeight: 'bold', color: '#38bdf8' }}>{order.order_number}</td>
                            <td style={{ padding: '10px', color: '#f8fafc', fontWeight: 'bold' }}>{order.customer_name}</td>
                            <td style={{ padding: '10px', color: '#cbd5e1' }}>{order.service_name}</td>
                            <td style={{ padding: '10px', color: '#94a3b8' }}>{order.worker_name}</td>
                            <td style={{ padding: '10px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', background: order.qc_status === 'PASSED' ? 'rgba(16,185,129,0.2)' : order.qc_status === 'FAILED' ? 'rgba(239,68,68,0.2)' : '#334155', color: order.qc_status === 'PASSED' ? '#34d399' : order.qc_status === 'FAILED' ? '#f87171' : '#94a3b8', fontWeight: 700, fontSize: '11px' }}>
                                {order.qc_status}
                              </span>
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleUpdateOrderQC(order.id, 'PASSED')} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>✓ Lulus QC</button>
                                <button onClick={() => handleUpdateOrderQC(order.id, 'FAILED')} style={{ padding: '6px 12px', background: '#dc2626', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>⚠️ Gagal QC</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pendingResultItems.length > 0 && (
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', marginBottom: '8px' }}>Action Plan Results:</div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                            <th style={{ padding: '10px' }}>ID Hasil</th>
                            <th style={{ padding: '10px' }}>Metrik Kualitas</th>
                            <th style={{ padding: '10px' }}>Tindakan QC</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingResultItems.map(({ result: res }) => (
                            <tr key={res.id} style={{ borderBottom: '1px solid #334155' }}>
                              <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{res.id}</td>
                              <td style={{ padding: '10px' }}>{res.metric_name_snapshot}</td>
                              <td style={{ padding: '10px' }}>
                                <button onClick={() => handleVerifyResult(res.id)} style={{ padding: '6px 12px', background: '#7c3aed', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>✓ Lulus QC</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MISSED TARGETS TAB */}
            {activeTab === 'MISSED_TARGETS' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#ec4899' }}>
                  Target Meleset
                </h2>
                {missedTargetItems.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Semua target evaluasi operasional cabang tercapai dengan baik.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px' }}>ID Evaluasi</th>
                        <th style={{ padding: '10px' }}>Hasil Evaluasi</th>
                        <th style={{ padding: '10px' }}>Tindakan Korektif</th>
                      </tr>
                    </thead>
                    <tbody>
                      {missedTargetItems.map(({ evaluation: evalRec }) => (
                        <tr key={evalRec.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{evalRec.id}</td>
                          <td style={{ padding: '10px' }}>{evalRec.evaluation_notes}</td>
                          <td style={{ padding: '10px' }}>
                            <button onClick={() => handleCreateCorrectiveAction(evalRec.id, evalRec.branch_id)} style={{ padding: '6px 12px', background: '#be185d', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}>+ Buat Action Plan</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* OUTBOX FAILURES TAB */}
            {activeTab === 'OUTBOX_FAILURES' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 16px 0', color: '#f43f5e' }}>
                  Pesan Gagal Terkirim
                </h2>
                {outboxFailures.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '13px' }}>Semua pengiriman notifikasi dan pesan WA berjalan lancar tanpa kendala.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px' }}>ID Event</th>
                        <th style={{ padding: '10px' }}>Tipe Notifikasi</th>
                        <th style={{ padding: '10px' }}>Rincian Kendala</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outboxFailures.map((fail) => (
                        <tr key={fail.outbox_event_id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#f43f5e' }}>{fail.outbox_event_id}</td>
                          <td style={{ padding: '10px' }}>{fail.event_type}</td>
                          <td style={{ padding: '10px', color: '#fca5a5' }}>{fail.error_message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* GAMIFIKASI TAB */}
            {activeTab === 'GAMIFIKASI' && (
              <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#f59e0b' }}>
                      Performa Gamifikasi & Tier Cabang
                    </h2>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, padding: '6px 14px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #f59e0b', color: '#fbbf24' }}>
                    {branchGamificationTier.badge} ({branchGamificationTier.points} Poin)
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8', background: '#0f172a' }}>
                        <th style={{ padding: '10px' }}>Nama Staf</th>
                        <th style={{ padding: '10px' }}>Cabang</th>
                        <th style={{ padding: '10px' }}>SPK Selesai</th>
                        <th style={{ padding: '10px' }}>Omzet Realisasi</th>
                        <th style={{ padding: '10px' }}>Pelanggan Baru</th>
                        <th style={{ padding: '10px' }}>Total Poin</th>
                        <th style={{ padding: '10px' }}>Rank Tier & Badge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gamificationRecords.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>{r.staff_name}</td>
                          <td style={{ padding: '10px', color: '#cbd5e1' }}>{r.branch_name}</td>
                          <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>{r.completed_transactions_count} SPK</td>
                          <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>Rp {r.revenue_amount.toLocaleString('id-ID')}</td>
                          <td style={{ padding: '10px', color: '#fbbf24', fontWeight: 'bold' }}>{r.new_customers_count} Orang</td>
                          <td style={{ padding: '10px', color: '#f59e0b', fontWeight: 'extrabold' }}>{r.points_earned} Poin</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#0f172a', border: '1px solid #f59e0b', color: '#fbbf24' }}>
                              {r.badge}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* SECTION: PERSETUJUAN KASIR */}
        {activeSection === 'PERSETUJUAN_KASIR' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 20px 0' }}>
              Persetujuan Kasir
            </h2>

            {/* Permintaan Diskon Khusus */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ef4444', margin: '0 0 12px 0' }}>
                Permintaan Diskon Khusus (&gt;10%)
              </h3>
              {pendingDiscounts.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada permintaan diskon khusus saat ini.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>No. Nota</th>
                      <th style={{ padding: '10px' }}>Kasir</th>
                      <th style={{ padding: '10px' }}>Diskon Memohon</th>
                      <th style={{ padding: '10px' }}>Waktu</th>
                      <th style={{ padding: '10px' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDiscounts.map(disc => (
                      <tr key={disc.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#38bdf8' }}>{disc.notaNumber}</td>
                        <td style={{ padding: '10px' }}>{disc.cashierName}</td>
                        <td style={{ padding: '10px', color: '#ef4444', fontWeight: 'bold' }}>{disc.requestedPercent}% (Rp {disc.requestedAmount.toLocaleString('id-ID')})</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{disc.time}</td>
                        <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApproveDiscount(disc.id)} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Setujui Diskon</button>
                          <button onClick={() => handleRejectDiscount(disc.id)} style={{ padding: '6px 12px', background: '#dc2626', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Tolak</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Permintaan Pembatalan Nota */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b', margin: '0 0 12px 0' }}>
                Permintaan Pembatalan Nota
              </h3>
              {pendingCancellations.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada permintaan pembatalan nota saat ini.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>No. Nota</th>
                      <th style={{ padding: '10px' }}>Kasir</th>
                      <th style={{ padding: '10px' }}>Alasan Pembatalan</th>
                      <th style={{ padding: '10px' }}>Waktu</th>
                      <th style={{ padding: '10px' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCancellations.map(canc => (
                      <tr key={canc.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#38bdf8' }}>{canc.notaNumber}</td>
                        <td style={{ padding: '10px' }}>{canc.cashierName}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{canc.reason}</td>
                        <td style={{ padding: '10px', color: '#94a3b8' }}>{canc.time}</td>
                        <td style={{ padding: '10px', display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleApproveCancellation(canc.id)} style={{ padding: '6px 12px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Setujui Pembatalan</button>
                          <button onClick={() => handleRejectCancellation(canc.id)} style={{ padding: '6px 12px', background: '#dc2626', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Tolak</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* SECTION: PRESENSI & TIM CABANG */}
        {activeSection === 'PRESENSI_TIM' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 20px 0' }}>
              Presensi & Tim Cabang
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Staf Hadir</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
                  {teamEmployees.filter(e => e.employment_status === 'ACTIVE').length || 4} Orang
                </div>
              </div>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Staf Tidak Hadir / Izin</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                  {teamEmployees.filter(e => e.employment_status !== 'ACTIVE').length || 1} Orang
                </div>
              </div>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Kapasitas Tim Hari Ini</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>80% (Cukup)</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                  <th style={{ padding: '10px' }}>Nama Staf</th>
                  <th style={{ padding: '10px' }}>Peran</th>
                  <th style={{ padding: '10px' }}>Status Presensi</th>
                  <th style={{ padding: '10px' }}>Beban Kerja / Catatan</th>
                </tr>
              </thead>
              <tbody>
                {teamEmployees.length > 0 ? (
                  teamEmployees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>{emp.full_name}</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>{emp.position_name || 'Staf Operasional'}</td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: emp.employment_status === 'ACTIVE' ? '#064e3b' : '#7f1d1d', color: emp.employment_status === 'ACTIVE' ? '#a7f3d0' : '#fecaca' }}>
                          {emp.employment_status === 'ACTIVE' ? 'Hadir (08:00 WIB)' : 'Tidak Hadir'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: '#38bdf8' }}>{emp.phone || 'Kapasitas Normal'}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>Agus Pratama</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>Teknisi Utama</td>
                      <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>Hadir (07:55 WIB)</td>
                      <td style={{ padding: '10px', color: '#38bdf8' }}>3 SPK Active</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>Rina Wijaya</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>Teknisi Finishing</td>
                      <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>Hadir (08:02 WIB)</td>
                      <td style={{ padding: '10px', color: '#38bdf8' }}>2 SPK Active</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>Siti Rahma</td>
                      <td style={{ padding: '10px', color: '#cbd5e1' }}>Kasir Senior</td>
                      <td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>Hadir (07:48 WIB)</td>
                      <td style={{ padding: '10px', color: '#94a3b8' }}>Kasir Front Office</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION: RETENSI & KOMUNIKASI PELANGGAN */}
        {activeSection === 'RETENSI_PELANGGAN' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
              Retensi & Komunikasi Pelanggan
            </h2>

            {/* Happy Hour Section */}
            <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: 0 }}>
                  Rekomendasi Diskon Jam Sepi
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', backgroundColor: happyHourActive ? '#064e3b' : '#334155', color: happyHourActive ? '#a7f3d0' : '#94a3b8' }}>
                  {happyHourActive ? '🟢 Diskon Jam Sepi Aktif' : '⚪ Nonaktif'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Persentase Diskon Jam Sepi:</span>
                  <input
                    type="number"
                    value={happyHourPercent}
                    onChange={(e) => setHappyHourPercent(parseInt(e.target.value, 10) || 0)}
                    style={{ width: '70px', padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontWeight: 'bold' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>%</span>
                </div>

                {happyHourActive ? (
                  <button
                    onClick={() => { setHappyHourActive(false); setActionMessage({ type: 'error', text: 'Diskon Jam Sepi dinonaktifkan.' }); }}
                    style={{ padding: '8px 16px', background: '#dc2626', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Nonaktifkan Diskon Jam Sepi
                  </button>
                ) : (
                  <button
                    onClick={() => { setHappyHourActive(true); setActionMessage({ type: 'success', text: `Diskon Jam Sepi (${happyHourPercent}%) berhasil diaktifkan.` }); }}
                    style={{ padding: '8px 16px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
                  >
                    Aktifkan Diskon Jam Sepi ({happyHourPercent}%)
                  </button>
                )}
              </div>
            </div>

            {/* Quick WA Engine Mandate Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>Sapaan Pelanggan</h4>
                <button
                  onClick={() => handleMandateWaFromKC(selectedWaCustomerName || 'Pelanggan', selectedWaCustomerPhone, 'SAPAAN')}
                  style={{ width: '100%', padding: '8px', background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  📋 Mandat Sapaan ke Kasir
                </button>
              </div>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>Pengingat Perawatan</h4>
                <button
                  onClick={() => handleMandateWaFromKC(selectedWaCustomerName || 'Pelanggan', selectedWaCustomerPhone, 'REMINDER')}
                  style={{ width: '100%', padding: '8px', background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  📋 Mandat Pengingat ke Kasir
                </button>
              </div>
              <div style={{ padding: '16px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#f8fafc' }}>Pelanggan Inaktif (&gt;60 Hari)</h4>
                <button
                  onClick={() => handleMandateWaFromKC(selectedWaCustomerName || 'Pelanggan Inaktif', selectedWaCustomerPhone, 'HYPPOSELLING', customMessageKC)}
                  style={{ width: '100%', padding: '8px', background: '#d97706', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  📋 Mandat Promo Re-Engage
                </button>
              </div>
            </div>

            {/* Table: Pelanggan Inaktif (>60 Hari) */}
            <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', margin: 0 }}>
                  Daftar Pelanggan Inaktif (&gt;60 Hari Belum Kembali)
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Total: {dormantCustomers.length} Pelanggan Target
                </span>
              </div>

              {dormantCustomers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Tidak ada pelanggan inaktif &gt;60 hari saat ini.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px' }}>Nama Pelanggan</th>
                        <th style={{ padding: '10px' }}>No. WhatsApp</th>
                        <th style={{ padding: '10px' }}>Hari Inaktif</th>
                        <th style={{ padding: '10px' }}>Status Retensi</th>
                        <th style={{ padding: '10px' }}>Tindakan Mandat KC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dormantCustomers.map((c) => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>{c.nama}</td>
                          <td style={{ padding: '10px', color: '#38bdf8', fontFamily: 'monospace' }}>{c.no_hp}</td>
                          <td style={{ padding: '10px', color: '#ef4444', fontWeight: 'bold' }}>{c.recencyDays} Hari</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: c.status === 'DORMANT' ? '#7f1d1d' : '#78350f', color: c.status === 'DORMANT' ? '#fecaca' : '#fef3c7' }}>
                              {c.status === 'DORMANT' ? 'DORMANT (>90 Hari)' : 'AT RISK (>60 Hari)'}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>
                            <button
                              onClick={() => {
                                setSelectedWaCustomerName(c.nama);
                                setSelectedWaCustomerPhone(c.no_hp);
                                setCustomMessageKC(`Halo Kak ${c.nama}! Khusus pelanggan setia cabang kami, nikmati promo spesial perawatan terbatas minggu ini. Balas pesan ini untuk info promo!`);
                                handleMandateWaFromKC(c.nama, c.no_hp, 'HYPPOSELLING');
                              }}
                              style={{ padding: '6px 12px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              📋 Beri Mandat ke Kasir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* WA Template Engine Customization Form */}
            <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0' }}>
                Beri Mandat Pesan WA Engine (Kepala Cabang ke Kasir)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Target Pelanggan</label>
                  <input
                    type="text"
                    value={selectedWaCustomerName}
                    onChange={(e) => setSelectedWaCustomerName(e.target.value)}
                    placeholder="Nama Pelanggan"
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>No. WhatsApp Target</label>
                  <input
                    type="text"
                    value={selectedWaCustomerPhone}
                    onChange={(e) => setSelectedWaCustomerPhone(e.target.value)}
                    placeholder="Contoh: 08212345678"
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Kategori Pesan WA</label>
                  <select
                    value={waCategoryKC}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setWaCategoryKC(cat);
                      const name = selectedWaCustomerName || 'Pelanggan';
                      if (cat === 'SAPAAN') {
                        setCustomMessageKC(`Halo Kak ${name}, terima kasih telah mempercayakan pengerjaan barang Anda pada cabang kami. Bagaimana hasil pengerjaan tim kami? Salam hangat dari tim PILIN ERP!`);
                      } else if (cat === 'REMINDER') {
                        setCustomMessageKC(`Halo Kak ${name}, pengingat ramah dari tim PILIN ERP. Waktunya perawatan rutin untuk barang kesayangan Anda agar tetap optimal!`);
                      } else if (cat === 'QUOTE') {
                        setCustomMessageKC(`Halo Kak ${name}, "Kebersihan dan kerapihan adalah cermin kenyamanan." Selamat beraktivitas dari tim PILIN ERP!`);
                      } else {
                        setCustomMessageKC(`Halo Kak ${name}! Khusus pelanggan setia cabang kami, nikmati promo spesial perawatan terbatas minggu ini. Balas pesan ini untuk info promo!`);
                      }
                    }}
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="HYPPOSELLING">Promo Re-Engage (&gt;60 Hari)</option>
                    <option value="SAPAAN">Sapaan &amp; Check-in Pelanggan</option>
                    <option value="REMINDER">Pengingat Perawatan Perkala</option>
                    <option value="QUOTE">Quotes &amp; Edukasi Perawatan</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Teks Pesan Mandat (Custom Template)</label>
                <textarea
                  rows={3}
                  value={customMessageKC}
                  onChange={(e) => setCustomMessageKC(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              <button
                onClick={() => handleMandateWaFromKC(selectedWaCustomerName, selectedWaCustomerPhone, waCategoryKC, customMessageKC)}
                style={{ padding: '10px 20px', background: '#2563eb', border: 'none', color: '#ffffff', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                📋 Teruskan Mandat Pengiriman ke Kasir
              </button>
            </div>

            {/* WA Sent Logs Table */}
            <div style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Histori Mandat &amp; Log Pengiriman WA Engine (KC &amp; Kasir)
                </h3>
                <button
                  onClick={refreshWaLogs}
                  style={{ padding: '4px 10px', background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                >
                  🔄 Refresh Log
                </button>
              </div>

              {waLogs.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Belum ada histori pengiriman WA Engine.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                        <th style={{ padding: '10px' }}>ID Mandat</th>
                        <th style={{ padding: '10px' }}>Pelanggan</th>
                        <th style={{ padding: '10px' }}>No. WhatsApp</th>
                        <th style={{ padding: '10px' }}>Kategori</th>
                        <th style={{ padding: '10px' }}>Waktu / Penugasan</th>
                        <th style={{ padding: '10px' }}>Status Mandat &amp; Eksekusi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waLogs.map((log) => (
                        <tr key={log.id} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{log.id}</td>
                          <td style={{ padding: '10px', fontWeight: 'bold', color: '#f8fafc' }}>{log.customer_name}</td>
                          <td style={{ padding: '10px', color: '#cbd5e1' }}>{log.customer_phone}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155' }}>
                              {log.category}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: '#94a3b8' }}>{new Date(log.created_at).toLocaleString('id-ID')}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: log.status === 'MANDATED' ? '#78350f' : '#064e3b', color: log.status === 'MANDATED' ? '#fef3c7' : '#a7f3d0' }}>
                              {log.status === 'MANDATED' ? '📋 MENUNGGU EKSEKUSI KASIR' : '✓ TERKIRIM OLEH KASIR'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECTION: PENGELUARAN & KEUANGAN CABANG */}
        {activeSection === 'PENGELUARAN_CABANG' && (
          <div style={{ backgroundColor: '#1e293b', borderRadius: '12px', padding: '24px', border: '1px solid #334155' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc', margin: '0 0 20px 0' }}>
              Pengeluaran & Keuangan Cabang
            </h2>

            {/* Input Form */}
            <form onSubmit={handleAddExpense} style={{ padding: '20px', background: '#0f172a', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0' }}>
                Input Pengeluaran Cabang
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Kategori Pengeluaran</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                  >
                    <option value="OPERATIONAL">Operasional Harian</option>
                    <option value="UTILITIES">Utilitas</option>
                    <option value="SUPPLIES">Perlengkapan & Bahan</option>
                    <option value="MAINTENANCE">Pemeliharaan</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Nominal (Rp)</label>
                  <input
                    type="number"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="Contoh: 150000"
                    style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>Catatan Pengeluaran</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Keterangan pengeluaran cabang"
                  style={{ width: '100%', padding: '8px 12px', background: '#1e293b', border: '1px solid #475569', color: '#ffffff', borderRadius: '6px', fontSize: '13px' }}
                />
              </div>

              <button type="submit" style={{ padding: '8px 16px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                + Catat Pengeluaran
              </button>
            </form>

            {/* List Table */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f8fafc', margin: '0 0 12px 0' }}>
                Daftar Pengeluaran Cabang
              </h3>

              {expenses.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Belum ada catatan pengeluaran cabang.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>ID Pengeluaran</th>
                      <th style={{ padding: '10px' }}>Kategori</th>
                      <th style={{ padding: '10px' }}>Nominal</th>
                      <th style={{ padding: '10px' }}>Catatan</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '10px', fontFamily: 'monospace', color: '#38bdf8' }}>{exp.id}</td>
                        <td style={{ padding: '10px' }}>{exp.category}</td>
                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#10b981' }}>Rp {exp.amount.toLocaleString('id-ID')}</td>
                        <td style={{ padding: '10px', color: '#cbd5e1' }}>{exp.notes || '-'}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', backgroundColor: exp.status === 'APPROVED' ? '#064e3b' : exp.status === 'REJECTED' ? '#7f1d1d' : '#78350f', color: exp.status === 'APPROVED' ? '#a7f3d0' : exp.status === 'REJECTED' ? '#fecaca' : '#fef3c7' }}>
                            {exp.status === 'APPROVED' ? 'Disetujui' : exp.status === 'REJECTED' ? 'Ditolak' : 'Menunggu Persetujuan'}
                          </span>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {exp.status === 'PENDING_APPROVAL' && exp.approval_tier === 'TIER_3_MANAGER' && (
                            <button onClick={() => handleApproveExpense(exp.id)} style={{ padding: '4px 10px', background: '#059669', border: 'none', color: '#ffffff', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>✓ Setujui</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

