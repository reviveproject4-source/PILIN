'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Phone, Mail, Calendar, MessageSquare, 
  CheckCircle2, Clock, AlertTriangle, ShieldCheck, ExternalLink, RefreshCw, Send, UserCheck, Eye
} from 'lucide-react';
import { 
  getProspectsListAction, 
  updateProspectFollowUpAction, 
  PilinProspectRecord, 
  ProspectMetricsSummary 
} from '@/app/super-admin/actions';

export function ProspectManagementView() {
  const [prospects, setProspects] = useState<PilinProspectRecord[]>([]);
  const [metrics, setMetrics] = useState<ProspectMetricsSummary>({
    totalProspects: 0,
    newProspects: 0,
    needsFollowUp: 0,
    activeTrials: 0,
    expiringTrials: 0,
    subscribed: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search, Filter & Sort State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'TRIAL_EXPIRING' | 'FOLLOWUP_LAST'>('NEWEST');

  // Selected Prospect Detail & Follow-up Modal State
  const [selectedProspect, setSelectedProspect] = useState<PilinProspectRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>('PROSPEK BARU');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editCsName, setEditCsName] = useState<string>('CS Minara');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchProspectsData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getProspectsListAction();
      if (res.success) {
        setProspects(res.prospects || []);
        setMetrics(res.metrics);
      } else {
        setErrorMsg(res.message || 'Gagal memuat data prospek dari database.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProspectsData();
  }, []);

  const handleOpenDetailModal = (item: PilinProspectRecord) => {
    setSelectedProspect(item);
    setEditStatus(item.status || 'PROSPEK BARU');
    setEditNotes(item.follow_up_notes || '');
    setEditCsName(item.assigned_cs_name || 'CS Minara');
    setFeedbackMsg(null);
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProspect) return;

    setIsUpdating(true);
    setFeedbackMsg(null);

    const res = await updateProspectFollowUpAction({
      prospectId: selectedProspect.id,
      status: editStatus,
      followUpNotes: editNotes,
      assignedCsName: editCsName,
    });

    setIsUpdating(false);

    if (res.success) {
      setFeedbackMsg({ type: 'success', text: 'Pembaruan status & catatan follow-up berhasil disimpan.' });
      fetchProspectsData();
      setTimeout(() => {
        setSelectedProspect(null);
      }, 1200);
    } else {
      setFeedbackMsg({ type: 'error', text: res.message || 'Gagal menyimpann catatan follow-up.' });
    }
  };

  const formatWaUrl = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const text = encodeURIComponent(`Halo Kak ${name}, salam dari CS PILIN/Minara ERP. Kami mengonfirmasi pendaftaran trial usaha Anda. Ada yang bisa kami bantu?`);
    return `https://wa.me/${targetPhone}?text=${text}`;
  };

  // Filtering & Sorting
  const filteredProspects = prospects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.owner_name?.toLowerCase().includes(q) ||
      p.whatsapp?.includes(q) ||
      p.email?.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'ALL' ||
      p.status === statusFilter ||
      (statusFilter === 'NEW' && (p.status === 'NEW' || p.status === 'PROSPEK BARU')) ||
      (statusFilter === 'CONTACTED' && (p.status === 'CONTACTED' || p.status === 'SUDAH DIHUBUNGI' || p.status === 'FOLLOW-UP')) ||
      (statusFilter === 'QUALIFIED' && (p.status === 'QUALIFIED' || p.status === 'TRIAL AKTIF')) ||
      (statusFilter === 'CLOSED_WON' && (p.status === 'CLOSED_WON' || p.status === 'BERLANGGANAN'));

    return matchSearch && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'NEWEST') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'TRIAL_EXPIRING') {
      const timeA = a.trial_end ? new Date(a.trial_end).getTime() : 0;
      const timeB = b.trial_end ? new Date(b.trial_end).getTime() : 0;
      return timeA - timeB;
    }
    if (sortBy === 'FOLLOWUP_LAST') {
      const timeA = a.last_followed_up_at ? new Date(a.last_followed_up_at).getTime() : 0;
      const timeB = b.last_followed_up_at ? new Date(b.last_followed_up_at).getTime() : 0;
      return timeB - timeA;
    }
    return 0;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Title & Refresh Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm text-white">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#F26522] text-white flex items-center justify-center font-black text-lg shadow-md">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">
                Daftar Prospek Calon Client PILIN (CS Minara)
              </h1>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchProspectsData}
          disabled={isLoading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* 6 Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Prospek</div>
          <div className="text-2xl font-black text-white">{metrics.totalProspects}</div>
        </div>
        <div className="bg-slate-900 border border-blue-500/30 p-4 rounded-xl space-y-1">
          <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Prospek Baru</div>
          <div className="text-2xl font-black text-blue-400">{metrics.newProspects}</div>
        </div>
        <div className="bg-slate-900 border border-amber-500/30 p-4 rounded-xl space-y-1">
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Perlu Follow-up</div>
          <div className="text-2xl font-black text-amber-400">{metrics.needsFollowUp}</div>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 p-4 rounded-xl space-y-1">
          <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Trial Aktif</div>
          <div className="text-2xl font-black text-emerald-400">{metrics.activeTrials}</div>
        </div>
        <div className="bg-slate-900 border border-rose-500/30 p-4 rounded-xl space-y-1">
          <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">Trial Berakhir</div>
          <div className="text-2xl font-black text-rose-400">{metrics.expiringTrials}</div>
        </div>
        <div className="bg-slate-900 border border-purple-500/30 p-4 rounded-xl space-y-1">
          <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Berlangganan</div>
          <div className="text-2xl font-black text-purple-400">{metrics.subscribed}</div>
        </div>
      </div>

      {/* CS Highlight Box: PERLU FOLLOW-UP */}
      {metrics.needsFollowUp > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 to-slate-900 border border-amber-500/40 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-black text-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-white text-sm">
                Area Perhatian CS Minara: Terdapat {metrics.needsFollowUp} prospek yang memerlukan tindakan follow-up!
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('NEW')}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-lg text-xs transition-all shadow-sm cursor-pointer"
          >
            Tampilkan Prospek Baru →
          </button>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Usaha, Owner/PIC, WhatsApp, atau Email..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Semua Status</option>
              <option value="NEW" className="bg-slate-900">PROSPEK BARU</option>
              <option value="CONTACTED" className="bg-slate-900">SUDAH DIHUBUNGI / FOLLOW-UP</option>
              <option value="QUALIFIED" className="bg-slate-900">TRIAL AKTIF</option>
              <option value="CLOSED_WON" className="bg-slate-900">BERLANGGANAN</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="NEWEST" className="bg-slate-900">Pendaftaran Terbaru</option>
              <option value="TRIAL_EXPIRING" className="bg-slate-900">Trial Akan Berakhir</option>
              <option value="FOLLOWUP_LAST" className="bg-slate-900">Follow-up Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Prospects Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-200">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Tanggal</th>
                <th className="p-4">Nama Usaha</th>
                <th className="p-4">Owner / PIC</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4">Email</th>
                <th className="p-4">Pegawai</th>
                <th className="p-4">Status</th>
                <th className="p-4">Trial</th>
                <th className="p-4">Follow-up</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F26522]" />
                    <span>Memuat data prospek aktual dari Supabase...</span>
                  </td>
                </tr>
              ) : filteredProspects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <div className="font-bold text-white text-sm">Tidak ada prospek yang terdaftar.</div>
                  </td>
                </tr>
              ) : (
                filteredProspects.map((p) => {
                  const dateFormatted = new Date(p.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={p.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="p-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {dateFormatted}
                      </td>
                      <td className="p-4 whitespace-nowrap font-bold text-white text-sm">
                        {p.name}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-300">
                        {p.owner_name || '—'}
                      </td>
                      <td className="p-4 whitespace-nowrap font-mono">
                        <a
                          href={formatWaUrl(p.whatsapp, p.owner_name || p.name)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-bold transition-all"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{p.whatsapp}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </a>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-300 font-mono">
                        {p.email || '—'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-400">
                        {p.employee_count || '1-5'}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          p.status === 'NEW' || p.status === 'PROSPEK BARU'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            : p.status === 'CONTACTED' || p.status === 'SUDAH DIHUBUNGI' || p.status === 'FOLLOW-UP'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : p.status === 'CLOSED_WON' || p.status === 'BERLANGGANAN'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-300">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>14 Hari Trial</span>
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-400 text-[11px]">
                        {p.last_followed_up_at
                          ? new Date(p.last_followed_up_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                          : 'Belum'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(p)}
                          className="px-3 py-1.5 bg-[#F26522] hover:bg-[#d95416] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Follow-up</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL & FOLLOW-UP MODAL */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white">Detail Prospek & Follow-up CS</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProspect(null)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            {feedbackMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                feedbackMsg.type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
              }`}>
                {feedbackMsg.text}
              </div>
            )}

            {/* IDENTITAS PROSPEK */}
            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="text-xs font-extrabold text-[#F26522] uppercase tracking-wider">IDENTITAS PROSPEK</div>
              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Nama Usaha:</div>
                  <div className="font-extrabold text-white text-sm">{selectedProspect.name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Nama Owner / PIC:</div>
                  <div className="font-bold text-white">{selectedProspect.owner_name || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">WhatsApp:</div>
                  <div className="font-mono text-emerald-400 font-bold">{selectedProspect.whatsapp}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Email Usaha:</div>
                  <div className="font-mono text-slate-300">{selectedProspect.email || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Jumlah Pegawai:</div>
                  <div className="font-bold text-white">{selectedProspect.employee_count || '1-5'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Tanggal Daftar:</div>
                  <div className="font-mono text-slate-400">
                    {new Date(selectedProspect.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {/* Direct WA Action */}
              <div className="pt-2">
                <a
                  href={formatWaUrl(selectedProspect.whatsapp, selectedProspect.owner_name || selectedProspect.name)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Hubungi via WhatsApp (wa.me) →</span>
                </a>
              </div>
            </div>

            {/* FORM UPDATE FOLLOW-UP CS */}
            <form onSubmit={handleSaveFollowUp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Update Status Prospek:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522]"
                >
                  <option value="NEW">PROSPEK BARU</option>
                  <option value="CONTACTED">SUDAH DIHUBUNGI / FOLLOW-UP</option>
                  <option value="QUALIFIED">TRIAL AKTIF</option>
                  <option value="CLOSED_WON">BERLANGGANAN</option>
                  <option value="CLOSED_LOST">TIDAK LANJUT</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nama PIC CS Minara:
                </label>
                <input
                  type="text"
                  value={editCsName}
                  onChange={(e) => setEditCsName(e.target.value)}
                  placeholder="Nama CS (Contoh: CS Minara - Ani)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Catatan Follow-up CS:
                </label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Tulis hasil komunikasi dengan calon owner (misal: telah dikontak via WA, respon positif, menjadwalkan demo)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProspect(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Menyimpan...' : 'Simpan Follow-up'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
