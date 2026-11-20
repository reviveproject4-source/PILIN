'use client';

import React, { useState, useEffect } from 'react';
import {
  Receipt,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  Wallet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  ArrowUpDown,
  FileText,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import {
  TransactionManagementService,
  RegularTransactionItem,
  DepositTopupItem,
} from '@/domains/commerce/transactionManagementService';

interface TransaksiPembatalanDashboardProps {
  businessId?: string;
  actorUserId?: string;
}

export function TransaksiPembatalanDashboard({
  businessId = '8ec99d6e-3f6f-47d4-910f-265cfe26c609',
  actorUserId = 'user-owner-01',
}: TransaksiPembatalanDashboardProps) {
  // Main Tab: 'REKAP' | 'PEMBATALAN'
  const [activeTab, setActiveTab] = useState<'REKAP' | 'PEMBATALAN'>('REKAP');

  // Sub Tab: 'REGULAR' | 'DEPOSIT'
  const [subTab, setSubTab] = useState<'REGULAR' | 'DEPOSIT'>('REGULAR');

  // Data states
  const [regularList, setRegularList] = useState<RegularTransactionItem[]>(() =>
    TransactionManagementService.getRegularTransactions(businessId)
  );
  const [depositList, setDepositList] = useState<DepositTopupItem[]>(() =>
    TransactionManagementService.getDepositTopups(businessId)
  );

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Cancellation Modal States
  const [targetCancelRegular, setTargetCancelRegular] = useState<RegularTransactionItem | null>(null);
  const [targetCancelDeposit, setTargetCancelDeposit] = useState<DepositTopupItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const reloadData = () => {
    setRegularList(TransactionManagementService.getRegularTransactions(businessId));
    setDepositList(TransactionManagementService.getDepositTopups(businessId));
  };

  useEffect(() => {
    reloadData();
    const handleUpdate = () => reloadData();
    window.addEventListener('pilin_transactions_updated', handleUpdate);
    window.addEventListener('pilin_deposits_updated', handleUpdate);
    return () => {
      window.removeEventListener('pilin_transactions_updated', handleUpdate);
      window.removeEventListener('pilin_deposits_updated', handleUpdate);
    };
  }, [businessId]);

  // Handle Cancel Regular Nota
  const handleConfirmCancelRegular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCancelRegular) return;
    if (!cancelReason.trim()) {
      setFeedback({ type: 'error', text: 'Alasan pembatalan nota wajib diisi.' });
      return;
    }

    const res = TransactionManagementService.cancelRegularTransaction(
      businessId,
      targetCancelRegular.id,
      cancelReason.trim(),
      'Owner'
    );

    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setTargetCancelRegular(null);
      setCancelReason('');
      reloadData();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Handle Cancel Deposit Top-up
  const handleConfirmCancelDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCancelDeposit) return;
    if (!cancelReason.trim()) {
      setFeedback({ type: 'error', text: 'Alasan pembatalan top-up deposit wajib diisi.' });
      return;
    }

    const res = TransactionManagementService.cancelDepositTopup(
      businessId,
      targetCancelDeposit.id,
      cancelReason.trim(),
      'Owner'
    );

    if (res.success) {
      setFeedback({ type: 'success', text: res.message });
      setTargetCancelDeposit(null);
      setCancelReason('');
      reloadData();
    } else {
      setFeedback({ type: 'error', text: res.message });
    }
  };

  // Filtered Regular List
  const filteredRegular = regularList.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.phone.includes(searchTerm) ||
      item.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus =
      filterStatus === 'ALL' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Filtered Deposit List
  const filteredDeposit = depositList.filter((item) => {
    const matchSearch =
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer_phone.includes(searchTerm);
    const matchStatus =
      filterStatus === 'ALL' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Summary Metrics
  const totalRegularIncome = regularList
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (t.total || 0), 0);

  const totalDepositIncome = depositList
    .filter((d) => d.status === 'SUCCESS')
    .reduce((sum, d) => sum + (d.amount || 0), 0);

  const totalCancelledRegular = regularList.filter((t) => t.status === 'CANCELLED').length;
  const totalCancelledDeposit = depositList.filter((d) => d.status === 'CANCELLED').length;

  return (
    <div className="space-y-6 font-sans">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-[#2563EB]" />
            <span>Transaksi &amp; Pembatalan</span>
          </h1>
        </div>

        {/* Tab Switcher: Rekap Transaksi vs Penghapusan/Pembatalan */}
        <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('REKAP')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'REKAP'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Rekap Transaksi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PEMBATALAN')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'PEMBATALAN'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>2. Penghapus / Pembatalan</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-black px-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Omzet Nota Regular</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              Rp {totalRegularIncome.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Total Deposit Masuk</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              Rp {totalDepositIncome.toLocaleString('id-ID')}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Nota Dibatalkan</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {totalCancelledRegular} Nota
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">Deposit Dibatalkan</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {totalCancelledDeposit} Transaksi
            </div>
          </div>
        </div>
      </div>

      {/* Sub Tabs Selector & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Sub Tabs: Regular vs Top-up Deposit */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => {
              setSubTab('REGULAR');
              setFilterStatus('ALL');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'REGULAR'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Daftar Nota Transaksi Regular ({regularList.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('DEPOSIT');
              setFilterStatus('ALL');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === 'DEPOSIT'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Daftar Top-up Deposit ({depositList.length})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nomor nota, pelanggan, WA..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            {subTab === 'REGULAR' ? (
              <>
                <option value="COMPLETED">Selesai / Lunas</option>
                <option value="CANCELLED">Dibatalkan</option>
              </>
            ) : (
              <>
                <option value="SUCCESS">Berhasil</option>
                <option value="CANCELLED">Dibatalkan</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* TABEL VIEW 1: NOTA REGULAR */}
      {subTab === 'REGULAR' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="p-3.5">No. Nota</th>
                  <th className="p-3.5">Pelanggan</th>
                  <th className="p-3.5">Layanan / Item</th>
                  <th className="p-3.5">Rincian Potongan</th>
                  <th className="p-3.5">Total Bayar</th>
                  <th className="p-3.5">Metode</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Waktu</th>
                  {activeTab === 'PEMBATALAN' && <th className="p-3.5 text-right">Aksi Pembatalan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredRegular.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'PEMBATALAN' ? 9 : 8} className="p-8 text-center text-slate-400">
                      Tidak ada data transaksi regular yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredRegular.map((trx) => (
                    <tr
                      key={trx.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors ${
                        trx.status === 'CANCELLED' ? 'bg-rose-50/50 dark:bg-rose-950/20 opacity-75' : ''
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {trx.id}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{trx.customer}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{trx.phone}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold">{trx.service}</div>
                        <div className="text-[11px] text-slate-500">
                          {trx.qty} {trx.pricing_unit || 'x'} @ Rp {trx.price?.toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {trx.discount_amount ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 mr-1">
                            Diskon Rp {trx.discount_amount.toLocaleString('id-ID')}
                          </span>
                        ) : null}
                        {trx.points_discount ? (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            Poin -Rp {trx.points_discount.toLocaleString('id-ID')}
                          </span>
                        ) : null}
                        {!trx.discount_amount && !trx.points_discount && (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 dark:text-white font-mono">
                        Rp {trx.total?.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {trx.method}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {trx.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Lunas / Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Dibatalkan
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        <div>{trx.time}</div>
                        <div className="font-mono">{trx.date}</div>
                        {trx.cancelled_reason && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1">
                            Alasan: {trx.cancelled_reason}
                          </div>
                        )}
                      </td>
                      {activeTab === 'PEMBATALAN' && (
                        <td className="p-3.5 text-right">
                          {trx.status === 'COMPLETED' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetCancelRegular(trx);
                                setCancelReason('');
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus / Batalkan</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 italic">
                              Telah Dibatalkan
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABEL VIEW 2: TOP-UP DEPOSIT */}
      {subTab === 'DEPOSIT' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="p-3.5">ID Top-up</th>
                  <th className="p-3.5">Pelanggan</th>
                  <th className="p-3.5">Nominal Top-up</th>
                  <th className="p-3.5">Saldo Sebelumnya</th>
                  <th className="p-3.5">Saldo Setelah Top-up</th>
                  <th className="p-3.5">Metode Pembayaran</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Waktu</th>
                  {activeTab === 'PEMBATALAN' && <th className="p-3.5 text-right">Aksi Pembatalan</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                {filteredDeposit.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'PEMBATALAN' ? 9 : 8} className="p-8 text-center text-slate-400">
                      Tidak ada data top-up deposit yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredDeposit.map((item) => (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-950/50 transition-colors ${
                        item.status === 'CANCELLED' ? 'bg-rose-50/50 dark:bg-rose-950/20 opacity-75' : ''
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.id}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{item.customer_name}</div>
                        <div className="font-mono text-slate-500 text-[11px]">{item.customer_phone}</div>
                      </td>
                      <td className="p-3.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        +Rp {item.amount.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        Rp {item.previous_balance.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 font-bold font-mono text-slate-900 dark:text-white">
                        Rp {item.current_balance.toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.payment_method}
                        </span>
                      </td>
                      <td className="p-3.5">
                        {item.status === 'SUCCESS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Berhasil
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" />
                            Dibatalkan
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">
                        <div>{item.time}</div>
                        <div className="font-mono">{item.date}</div>
                        {item.cancelled_reason && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1">
                            Alasan: {item.cancelled_reason}
                          </div>
                        )}
                      </td>
                      {activeTab === 'PEMBATALAN' && (
                        <td className="p-3.5 text-right">
                          {item.status === 'SUCCESS' ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTargetCancelDeposit(item);
                                setCancelReason('');
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 ml-auto transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Batalkan Deposit</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 italic">
                              Telah Dibatalkan
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: KONFIRMASI PEMBATALAN NOTA REGULAR */}
      {targetCancelRegular && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span>Konfirmasi Pembatalan Nota</span>
              </h3>
              <button
                type="button"
                onClick={() => setTargetCancelRegular(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>Nomor Nota:</span>
                <span className="font-mono text-rose-600">{targetCancelRegular.id}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Pelanggan:</span>
                <span>{targetCancelRegular.customer} ({targetCancelRegular.phone})</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Total Transaksi:</span>
                <span className="font-bold">Rp {targetCancelRegular.total.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCancelRegular} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alasan Pembatalan / Penghapusan Nota *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Salah input pesanan kiloan, pelanggan membatalkan pesanan, dll..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetCancelRegular(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Ya, Batalkan Nota Resmi Ini
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: KONFIRMASI PEMBATALAN TOP-UP DEPOSIT */}
      {targetCancelDeposit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-rose-600 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <span>Konfirmasi Pembatalan Top-up Deposit</span>
              </h3>
              <button
                type="button"
                onClick={() => setTargetCancelDeposit(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>ID Transaksi Deposit:</span>
                <span className="font-mono text-rose-600">{targetCancelDeposit.id}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Pelanggan:</span>
                <span>{targetCancelDeposit.customer_name} ({targetCancelDeposit.customer_phone})</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Nominal Top-up Dibatalkan:</span>
                <span className="font-bold text-rose-600">Rp {targetCancelDeposit.amount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmCancelDeposit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Alasan Pembatalan Top-up *
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Salah nominal input top-up, transfer QRIS gagal, dll..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetCancelDeposit(null)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                >
                  Ya, Batalkan Transaksi Deposit Ini
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
