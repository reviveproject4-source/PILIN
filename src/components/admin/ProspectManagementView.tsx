'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Phone, Mail, Calendar, MessageSquare, 
  Clock, ShieldCheck, ExternalLink, RefreshCw, Send, Plus, MapPin, Briefcase, FileText, User, Building2
} from 'lucide-react';
import { 
  getProspectsListAction, 
  createSalesProspectAction,
  getProspectActivitiesAction,
  addProspectActivityAction,
  updateProspectDetailsAction,
  PilinProspectRecord, 
  PilinProspectActivityRecord
} from '@/app/super-admin/actions';

export function ProspectManagementView() {
  const [prospects, setProspects] = useState<PilinProspectRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'NEXT_FOLLOWUP' | 'TRIAL_EXPIRING'>('NEWEST');

  // Manual Add Prospect Modal State (SOURCE = SALES)
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addBusinessName, setAddBusinessName] = useState('');
  const [addOwnerName, setAddOwnerName] = useState('');
  const [addContactNumber, setAddContactNumber] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addEmployeeCount, setAddEmployeeCount] = useState('1-5');
  const [addCityArea, setAddCityArea] = useState('');
  const [addBusinessType, setAddBusinessType] = useState('');
  const [addInitialNotes, setAddInitialNotes] = useState('');
  const [addAssignedCsName, setAddAssignedCsName] = useState('Sales PILIN');
  const [isAdding, setIsAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  // Selected Prospect Detail & Activity Modal State
  const [selectedProspect, setSelectedProspect] = useState<PilinProspectRecord | null>(null);
  const [activities, setActivities] = useState<PilinProspectActivityRecord[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState<boolean>(false);

  // Detail Edit State
  const [editStatus, setEditStatus] = useState<string>('PROSPEK BARU');
  const [editCsName, setEditCsName] = useState<string>('CS PILIN');
  const [editNextFollowUpAt, setEditNextFollowUpAt] = useState<string>('');
  const [editNextFollowUpNotes, setEditNextFollowUpNotes] = useState<string>('');

  // New Activity Form State
  const [actType, setActType] = useState<string>('WhatsApp');
  const [actPicName, setActPicName] = useState<string>('CS PILIN');
  const [actNotes, setActNotes] = useState<string>('');
  const [actResult, setActResult] = useState<string>('');
  const [actStatusUpdate, setActStatusUpdate] = useState<string>('');
  const [actNextFollowUpAt, setActNextFollowUpAt] = useState<string>('');
  const [actNextFollowUpNotes, setActNextFollowUpNotes] = useState<string>('');
  const [isSubmittingAct, setIsSubmittingAct] = useState<boolean>(false);
  const [detailFeedback, setDetailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState<boolean>(false);

  const fetchProspectsData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await getProspectsListAction();
      if (res.success) {
        setProspects(res.prospects || []);
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

  const fetchActivities = async (prospectId: string) => {
    setActivitiesLoading(true);
    try {
      const res = await getProspectActivitiesAction(prospectId);
      if (res.success) {
        setActivities(res.activities || []);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const handleOpenDetailModal = (item: PilinProspectRecord) => {
    setSelectedProspect(item);
    setEditStatus(item.status || 'PROSPEK BARU');
    setEditCsName(item.assigned_cs_name || 'CS PILIN');
    setEditNextFollowUpAt(item.next_follow_up_at ? new Date(item.next_follow_up_at).toISOString().slice(0, 16) : '');
    setEditNextFollowUpNotes(item.next_follow_up_notes || '');

    setActPicName(item.assigned_cs_name || 'CS PILIN');
    setActNotes('');
    setActResult('');
    setActStatusUpdate(item.status || 'PROSPEK BARU');
    setActNextFollowUpAt('');
    setActNextFollowUpNotes('');
    setDetailFeedback(null);

    fetchActivities(item.id);
  };

  const handleCreateSalesProspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addBusinessName.trim() || !addOwnerName.trim() || !addContactNumber.trim()) {
      setAddFeedback('Nama Usaha, Nama Owner, dan WhatsApp wajib diisi.');
      return;
    }

    setIsAdding(true);
    setAddFeedback(null);

    try {
      const res = await createSalesProspectAction({
        businessName: addBusinessName,
        ownerName: addOwnerName,
        contactNumber: addContactNumber,
        email: addEmail,
        employeeCount: addEmployeeCount,
        cityArea: addCityArea,
        businessType: addBusinessType,
        initialNotes: addInitialNotes,
        assignedCsName: addAssignedCsName,
      });

      setIsAdding(false);

      if (res.success) {
        setAddFeedback('Prospek sales berhasil ditambahkan ke Wadah Prospek.');
        fetchProspectsData();
        setTimeout(() => {
          setIsAddModalOpen(false);
          setAddBusinessName('');
          setAddOwnerName('');
          setAddContactNumber('');
          setAddEmail('');
          setAddCityArea('');
          setAddBusinessType('');
          setAddInitialNotes('');
          setAddFeedback(null);
        }, 1200);
      } else {
        setAddFeedback(res.message || 'Gagal menyimpan prospek.');
      }
    } catch (err: any) {
      setIsAdding(false);
      setAddFeedback(err.message || 'Terjadi kesalahan sistem.');
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProspect) return;

    setIsSavingDetails(true);
    setDetailFeedback(null);

    try {
      const res = await updateProspectDetailsAction({
        prospectId: selectedProspect.id,
        status: editStatus,
        assignedCsName: editCsName,
        nextFollowUpAt: editNextFollowUpAt || undefined,
        nextFollowUpNotes: editNextFollowUpNotes || undefined,
      });

      setIsSavingDetails(false);

      if (res.success) {
        setDetailFeedback({ type: 'success', text: 'Perubahan status & jadwal follow-up berhasil disimpan.' });
        setSelectedProspect({
          ...selectedProspect,
          status: editStatus,
          assigned_cs_name: editCsName,
          next_follow_up_at: editNextFollowUpAt ? new Date(editNextFollowUpAt).toISOString() : undefined,
          next_follow_up_notes: editNextFollowUpNotes,
        });
        fetchProspectsData();
      } else {
        setDetailFeedback({ type: 'error', text: res.message || 'Gagal memperbarui data.' });
      }
    } catch (err: any) {
      setIsSavingDetails(false);
      setDetailFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProspect) return;
    if (!actNotes.trim()) {
      setDetailFeedback({ type: 'error', text: 'Catatan aktivitas tidak boleh kosong.' });
      return;
    }

    setIsSubmittingAct(true);
    setDetailFeedback(null);

    try {
      const res = await addProspectActivityAction({
        prospectId: selectedProspect.id,
        picName: actPicName || 'CS PILIN',
        activityType: actType,
        notes: actNotes,
        result: actResult || undefined,
        status: actStatusUpdate || undefined,
        nextFollowUpAt: actNextFollowUpAt || undefined,
        nextFollowUpNotes: actNextFollowUpNotes || undefined,
      });

      setIsSubmittingAct(false);

      if (res.success) {
        setDetailFeedback({ type: 'success', text: 'Aktivitas follow-up berhasil dicatat ke histori.' });
        setActNotes('');
        setActResult('');
        fetchActivities(selectedProspect.id);
        fetchProspectsData();
      } else {
        setDetailFeedback({ type: 'error', text: res.message || 'Gagal mencatat aktivitas.' });
      }
    } catch (err: any) {
      setIsSubmittingAct(false);
      setDetailFeedback({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    }
  };

  const formatWaUrl = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('0') ? `62${cleanPhone.slice(1)}` : cleanPhone;
    const text = encodeURIComponent(`Halo Kak ${name}, salam dari CS PILIN ERP. Kami mengonfirmasi pendaftaran usaha Anda. Ada yang bisa kami bantu?`);
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
      p.email?.toLowerCase().includes(q) ||
      p.city_area?.toLowerCase().includes(q);

    const matchSource =
      sourceFilter === 'ALL' ||
      (sourceFilter === 'SALES' && p.source === 'SALES') ||
      (sourceFilter === 'FORM_TRIAL' && (p.source === 'FORM_TRIAL' || !p.source));

    const matchStatus =
      statusFilter === 'ALL' ||
      p.status === statusFilter ||
      (statusFilter === 'PROSPEK BARU' && (p.status === 'NEW' || p.status === 'PROSPEK BARU')) ||
      (statusFilter === 'DIHUBUNGI' && (p.status === 'CONTACTED' || p.status === 'SUDAH DIHUBUNGI')) ||
      (statusFilter === 'FOLLOW-UP' && p.status === 'FOLLOW-UP') ||
      (statusFilter === 'TRIAL' && (p.status === 'QUALIFIED' || p.status === 'TRIAL' || p.status === 'TRIAL AKTIF')) ||
      (statusFilter === 'BERLANGGANAN' && (p.status === 'CLOSED_WON' || p.status === 'BERLANGGANAN')) ||
      (statusFilter === 'TIDAK LANJUT' && (p.status === 'CLOSED_LOST' || p.status === 'TIDAK LANJUT'));

    return matchSearch && matchSource && matchStatus;
  }).sort((a, b) => {
    if (sortBy === 'NEWEST') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'NEXT_FOLLOWUP') {
      const timeA = a.next_follow_up_at ? new Date(a.next_follow_up_at).getTime() : Infinity;
      const timeB = b.next_follow_up_at ? new Date(b.next_follow_up_at).getTime() : Infinity;
      return timeA - timeB;
    }
    if (sortBy === 'TRIAL_EXPIRING') {
      const timeA = a.trial_end ? new Date(a.trial_end).getTime() : Infinity;
      const timeB = b.trial_end ? new Date(b.trial_end).getTime() : Infinity;
      return timeA - timeB;
    }
    return 0;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm text-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#F26522] text-white flex items-center justify-center font-black text-lg shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">
              Wadah Prospek PILIN ERP
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-[#F26522] hover:bg-[#d95416] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Prospek Sales</span>
          </button>

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
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Nama Usaha, Owner/PIC, WA, Email, atau Kota..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Source Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold">Sumber:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Semua Sumber</option>
              <option value="SALES" className="bg-slate-900">SALES (Manual)</option>
              <option value="FORM_TRIAL" className="bg-slate-900">FORM TRIAL (14 Hari)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900">Semua Status</option>
              <option value="PROSPEK BARU" className="bg-slate-900">PROSPEK BARU</option>
              <option value="DIHUBUNGI" className="bg-slate-900">DIHUBUNGI</option>
              <option value="FOLLOW-UP" className="bg-slate-900">FOLLOW-UP</option>
              <option value="TERTARIK" className="bg-slate-900">TERTARIK</option>
              <option value="DEMO / BUSINESS CHECK" className="bg-slate-900">DEMO / BUSINESS CHECK</option>
              <option value="TRIAL" className="bg-slate-900">TRIAL</option>
              <option value="BERLANGGANAN" className="bg-slate-900">BERLANGGANAN</option>
              <option value="TIDAK LANJUT" className="bg-slate-900">TIDAK LANJUT</option>
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
              <option value="NEXT_FOLLOWUP" className="bg-slate-900">Next Follow-up Terdekat</option>
              <option value="TRIAL_EXPIRING" className="bg-slate-900">Trial Berakhir Terdekat</option>
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
                <th className="p-4">Email Usaha</th>
                <th className="p-4">Sumber</th>
                <th className="p-4">Status</th>
                <th className="p-4">PIC CS/Sales</th>
                <th className="p-4">Next Follow-up</th>
                <th className="p-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F26522]" />
                    <span>Memuat Wadah Prospek PILIN ERP...</span>
                  </td>
                </tr>
              ) : filteredProspects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 space-y-2">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <div className="font-bold text-white text-sm">Belum ada data prospek sales.</div>
                  </td>
                </tr>
              ) : (
                filteredProspects.map((p) => {
                  const dateFormatted = new Date(p.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  const isFormTrial = p.source === 'FORM_TRIAL' || !p.source;

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
                      <td className="p-4 whitespace-nowrap">
                        {isFormTrial ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            FORM_TRIAL (14 Hari)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            SALES (Manual)
                          </span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                          p.status === 'NEW' || p.status === 'PROSPEK BARU'
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                            : p.status === 'DIHUBUNGI' || p.status === 'CONTACTED' || p.status === 'SUDAH DIHUBUNGI'
                            ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                            : p.status === 'FOLLOW-UP'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            : p.status === 'TERTARIK' || p.status === 'DEMO / BUSINESS CHECK'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                            : p.status === 'BERLANGGANAN' || p.status === 'CLOSED_WON'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : p.status === 'TIDAK LANJUT' || p.status === 'CLOSED_LOST'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-300">
                        {p.assigned_cs_name || 'CS PILIN'}
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-400 text-[11px]">
                        {p.next_follow_up_at ? (
                          <div>
                            <div className="font-bold text-amber-400">
                              {new Date(p.next_follow_up_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {p.next_follow_up_notes && (
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                {p.next_follow_up_notes}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">Belum di-set</span>
                        )}
                      </td>
                      <td className="p-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(p)}
                          className="px-3 py-1.5 bg-[#F26522] hover:bg-[#d95416] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-1 mx-auto"
                        >
                          <span>Buka Detail & Activity</span>
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

      {/* MODAL: TAMBAH PROSPEK SALES (MANUAL) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-lg font-black text-white">Tambah Prospek Sales Baru</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2.5 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            {addFeedback && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
                {addFeedback}
              </div>
            )}

            <form onSubmit={handleCreateSalesProspect} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nama Usaha *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={addBusinessName}
                    onChange={(e) => setAddBusinessName(e.target.value)}
                    placeholder="Nama usaha prospek..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nama Owner / PIC *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={addOwnerName}
                    onChange={(e) => setAddOwnerName(e.target.value)}
                    placeholder="Nama owner / PIC..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Nomor Kontak / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={addContactNumber}
                    onChange={(e) => setAddContactNumber(e.target.value)}
                    placeholder="081234567890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Email Usaha
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="owner@usaha.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Jumlah Pegawai
                  </label>
                  <select
                    value={addEmployeeCount}
                    onChange={(e) => setAddEmployeeCount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="1-5">1 - 5 Pegawai</option>
                    <option value="6-15">6 - 15 Pegawai</option>
                    <option value="16-50">16 - 50 Pegawai</option>
                    <option value=">50">&gt; 50 Pegawai</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Kota / Area
                  </label>
                  <input
                    type="text"
                    value={addCityArea}
                    onChange={(e) => setAddCityArea(e.target.value)}
                    placeholder="Jakarta / Surabaya"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Jenis Usaha
                </label>
                <input
                  type="text"
                  value={addBusinessType}
                  onChange={(e) => setAddBusinessType(e.target.value)}
                  placeholder="Retail, Laundry, Bengkel, Resto, dll."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Sales / PIC Handling
                </label>
                <input
                  type="text"
                  value={addAssignedCsName}
                  onChange={(e) => setAddAssignedCsName(e.target.value)}
                  placeholder="Nama Sales / CS PIC"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Catatan Awal
                </label>
                <textarea
                  rows={2}
                  value={addInitialNotes}
                  onChange={(e) => setAddInitialNotes(e.target.value)}
                  placeholder="Catatan kebutuhan awal usaha..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-5 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>{isAdding ? 'Menyimpan...' : 'Simpan Prospek Sales'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL & ACTIVITY LOG PROSPEK */}
      {selectedProspect && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white">Detail & Operasional Prospek</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProspect(null)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2.5 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            {detailFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                detailFeedback.type === 'success' ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
              }`}>
                {detailFeedback.text}
              </div>
            )}

            {/* SECTION A: IDENTITAS PROSPEK */}
            <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-800 text-xs">
              <div className="text-xs font-extrabold text-[#F26522] uppercase tracking-wider flex items-center justify-between">
                <span>IDENTITAS PROSPEK</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  selectedProspect.source === 'SALES' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  Sumber: {selectedProspect.source || 'FORM_TRIAL'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-slate-300">
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
                  <div className="text-[10px] text-slate-500 font-bold">Kota / Area:</div>
                  <div className="font-bold text-white">{selectedProspect.city_area || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Jenis Usaha:</div>
                  <div className="font-bold text-white">{selectedProspect.business_type || '—'}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-bold">Tanggal Terdaftar:</div>
                  <div className="font-mono text-slate-400">
                    {new Date(selectedProspect.created_at).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              {selectedProspect.initial_notes && (
                <div className="pt-2 border-t border-slate-900">
                  <div className="text-[10px] text-slate-500 font-bold">Catatan Awal:</div>
                  <div className="text-slate-300 italic text-[11px]">{selectedProspect.initial_notes}</div>
                </div>
              )}

              {/* Direct WhatsApp Action Button */}
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

            {/* SECTION B: STATUS & OWNERSHIP */}
            <form onSubmit={handleSaveDetails} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="text-xs font-extrabold text-[#F26522] uppercase tracking-wider">
                STATUS & OWNERSHIP
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Status Lifecycle Prospek:
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522]"
                  >
                    <option value="PROSPEK BARU">PROSPEK BARU</option>
                    <option value="DIHUBUNGI">DIHUBUNGI</option>
                    <option value="FOLLOW-UP">FOLLOW-UP</option>
                    <option value="TERTARIK">TERTARIK</option>
                    <option value="DEMO / BUSINESS CHECK">DEMO / BUSINESS CHECK</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="BERLANGGANAN">BERLANGGANAN</option>
                    <option value="TIDAK LANJUT">TIDAK LANJUT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    PIC Sales / CS Handling:
                  </label>
                  <input
                    type="text"
                    value={editCsName}
                    onChange={(e) => setEditCsName(e.target.value)}
                    placeholder="Nama staf CS..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              {/* SECTION D: JADWAL NEXT FOLLOW-UP */}
              <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Tanggal & Waktu Next Follow-up:
                  </label>
                  <input
                    type="datetime-local"
                    value={editNextFollowUpAt}
                    onChange={(e) => setEditNextFollowUpAt(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Catatan Next Follow-up:
                  </label>
                  <input
                    type="text"
                    value={editNextFollowUpNotes}
                    onChange={(e) => setEditNextFollowUpNotes(e.target.value)}
                    placeholder="Misal: Janji telpon jam 2 siang..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingDetails}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <span>{isSavingDetails ? 'Menyimpan Details...' : 'Update Status & Schedule'}</span>
                </button>
              </div>
            </form>

            {/* SECTION C: TRIAL CONTEXT (Only if Form Trial or Trial Dates present) */}
            {(selectedProspect.source === 'FORM_TRIAL' || selectedProspect.trial_start || !selectedProspect.source) && (
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                <div className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>KONTEKS UJI COBA 14 HARI (TRIAL)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">Trial Start (Otomatis):</div>
                    <div className="font-mono text-slate-300">
                      {selectedProspect.trial_start
                        ? new Date(selectedProspect.trial_start).toLocaleDateString('id-ID')
                        : new Date(selectedProspect.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">Trial End (+14 Hari):</div>
                    <div className="font-mono text-amber-400 font-bold">
                      {selectedProspect.trial_end
                        ? new Date(selectedProspect.trial_end).toLocaleDateString('id-ID')
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">Status Trial:</div>
                    <div className="font-extrabold text-emerald-400">
                      {selectedProspect.trial_status || 'ACTIVE'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 font-bold">Sisa Waktu Trial:</div>
                    <div className="font-mono text-white font-bold">
                      {selectedProspect.trial_end
                        ? `${Math.max(0, Math.ceil((new Date(selectedProspect.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} Hari`
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION E: HISTORI AKTIVITAS (ACTIVITY LOG) */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="text-xs font-extrabold text-[#F26522] uppercase tracking-wider flex items-center justify-between">
                <span>HISTORI AKTIVITAS (ACTIVITY LOG)</span>
                <span className="text-[10px] text-slate-400 font-mono">Total: {activities.length} Aktivitas</span>
              </div>

              {/* Form Input Aktivitas Baru */}
              <form onSubmit={handleAddActivity} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Jenis Aktivitas:
                    </label>
                    <select
                      value={actType}
                      onChange={(e) => setActType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522]"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telepon">Telepon</option>
                      <option value="Email">Email</option>
                      <option value="Meeting / Demo">Meeting / Demo</option>
                      <option value="Follow-up Catatan">Follow-up Catatan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      PIC Petugas:
                    </label>
                    <input
                      type="text"
                      value={actPicName}
                      onChange={(e) => setActPicName(e.target.value)}
                      placeholder="Nama PIC CS/Sales"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Catatan Aktivitas *:
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={actNotes}
                    onChange={(e) => setActNotes(e.target.value)}
                    placeholder="Tulis hasil komunikasi / perkembangan follow-up..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Hasil (Opsional):
                    </label>
                    <input
                      type="text"
                      value={actResult}
                      onChange={(e) => setActResult(e.target.value)}
                      placeholder="Misal: Tertarik demo"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Update Status Prospek:
                    </label>
                    <select
                      value={actStatusUpdate}
                      onChange={(e) => setActStatusUpdate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522]"
                    >
                      <option value="">Jangan ubah status</option>
                      <option value="PROSPEK BARU">PROSPEK BARU</option>
                      <option value="DIHUBUNGI">DIHUBUNGI</option>
                      <option value="FOLLOW-UP">FOLLOW-UP</option>
                      <option value="TERTARIK">TERTARIK</option>
                      <option value="DEMO / BUSINESS CHECK">DEMO / BUSINESS CHECK</option>
                      <option value="TRIAL">TRIAL</option>
                      <option value="BERLANGGANAN">BERLANGGANAN</option>
                      <option value="TIDAK LANJUT">TIDAK LANJUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Set Next Follow-up:
                    </label>
                    <input
                      type="datetime-local"
                      value={actNextFollowUpAt}
                      onChange={(e) => setActNextFollowUpAt(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#F26522]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingAct}
                    className="px-4 py-2 bg-[#F26522] hover:bg-[#d95416] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingAct ? 'Menyimpan Activity...' : '+ Catat Aktivitas Baru'}</span>
                  </button>
                </div>
              </form>

              {/* List Chronological Activity Log Entries */}
              <div className="space-y-3 pt-2">
                {activitiesLoading ? (
                  <div className="text-center py-4 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#F26522]" />
                    <span>Memuat histori aktivitas...</span>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-400">
                    Belum ada histori aktivitas untuk prospek ini. Tulis catatan pertama di atas.
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            {act.activity_type}
                          </span>
                          <span className="font-bold text-white text-xs">{act.pic_name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">
                          {new Date(act.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-slate-200 text-xs leading-relaxed font-medium">
                        {act.notes}
                      </div>
                      {act.result && (
                        <div className="text-[11px] text-emerald-400 font-semibold pt-1 border-t border-slate-800/60">
                          Hasil: {act.result}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedProspect(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
