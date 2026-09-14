'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Employee, Division, Position, EmploymentStatus,
  CreateDivisionDTO, CreatePositionDTO, CreateEmployeeDTO, UpdateEmployeeDTO 
} from '@/domains/people/people.types';
import { PeopleRepository, BranchItem } from '@/domains/people/peopleRepository';
import { PresensiModule } from './PresensiModule';

interface PeopleManagementDashboardProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorRole: 'OWNER' | 'KEPALA_CABANG' | 'PEGAWAI';
  actorPermissions?: string[];
  initialTab?: 'EMPLOYEE' | 'DIVISION' | 'POSITION' | 'BRANCH' | 'PRESENSI';
}

export function PeopleManagementDashboard({
  businessId,
  branchId,
  actorUserId,
  actorRole,
  actorPermissions = [],
  initialTab = 'EMPLOYEE',
}: PeopleManagementDashboardProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'EMPLOYEE' | 'DIVISION' | 'POSITION' | 'BRANCH' | 'PRESENSI'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Master Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [authUsers, setAuthUsers] = useState<{ user_id: string; email: string; role_name?: string }[]>([]);

  // Loading & Notification States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterDivision, setFilterDivision] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal & Submit States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showDivisionModal, setShowDivisionModal] = useState<boolean>(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);

  const [showPositionModal, setShowPositionModal] = useState<boolean>(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);

  // Custom Input Toggle States for Employee Form
  const [isCustomPosition, setIsCustomPosition] = useState<boolean>(false);
  const [isCustomDivision, setIsCustomDivision] = useState<boolean>(false);
  const [isCustomBranch, setIsCustomBranch] = useState<boolean>(false);

  // Employee Form State
  const [empForm, setEmpForm] = useState<{
    employee_code: string;
    full_name: string;
    nickname: string;
    phone: string;
    email: string;
    address: string;
    join_date: string;
    employment_status: EmploymentStatus;
    branch_id: string;
    manual_branch_name: string;
    division_id: string;
    manual_division_name: string;
    position_id: string;
    manual_position_name: string;
    supervisor_id: string;
    auth_user_id: string;
    base_salary: number | '';
    incentive_rate: number | '';
  }>({
    employee_code: '',
    full_name: '',
    nickname: '',
    phone: '',
    email: '',
    address: '',
    join_date: new Date().toISOString().split('T')[0],
    employment_status: 'ACTIVE',
    branch_id: branchId && branchId !== 'ALL_BRANCHES' ? branchId : '',
    manual_branch_name: '',
    division_id: '',
    manual_division_name: '',
    position_id: '',
    manual_position_name: '',
    supervisor_id: '',
    auth_user_id: '',
    base_salary: '',
    incentive_rate: '',
  });

  // Division Form State
  const [divForm, setDivForm] = useState<{ code: string; name: string; description: string }>({
    code: '',
    name: '',
    description: '',
  });

  // Position Form State
  const [posForm, setPosForm] = useState<{ code: string; name: string; division_id: string; level: string; description: string }>({
    code: '',
    name: '',
    division_id: '',
    level: '',
    description: '',
  });

  // Branch Form State
  const [branchForm, setBranchForm] = useState<{ code: string; name: string; address: string }>({
    code: '',
    name: '',
    address: '',
  });

  // Permission Checks
  const canView = true;
  const canCreate = true;
  const canUpdate = true;

  // Load All Master Data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [divData, posData, empData, branchData, authUserData] = await Promise.all([
        PeopleRepository.listDivisions(businessId),
        PeopleRepository.listPositions(businessId),
        PeopleRepository.listEmployees(businessId),
        PeopleRepository.listBranches(businessId),
        PeopleRepository.listAuthUsers(businessId),
      ]);

      setDivisions(divData);
      setPositions(posData);
      setEmployees(empData);
      setBranches(branchData);
      setAuthUsers(authUserData);
    } catch (err: any) {
      console.error('Error loading people management data', err);
      setError(err.message || 'Gagal memuat data pegawai & organisasi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [businessId]);

  // Derived filtered employee list
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.full_name.toLowerCase().includes(q);
        const matchCode = emp.employee_code.toLowerCase().includes(q);
        const matchPhone = emp.phone ? emp.phone.includes(q) : false;
        const matchEmail = emp.email ? emp.email.toLowerCase().includes(q) : false;
        if (!matchName && !matchCode && !matchPhone && !matchEmail) return false;
      }

      if (filterBranch !== 'ALL' && emp.branch_id !== filterBranch) return false;
      if (filterDivision !== 'ALL' && emp.division_id !== filterDivision) return false;
      if (filterPosition !== 'ALL' && emp.position_id !== filterPosition) return false;
      if (filterStatus !== 'ALL' && emp.employment_status !== filterStatus) return false;

      return true;
    });
  }, [employees, searchQuery, filterBranch, filterDivision, filterPosition, filterStatus]);

  // Handle Employee Form Openers
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setIsCustomPosition(positions.length === 0);
    setIsCustomDivision(divisions.length === 0);
    setIsCustomBranch(branches.length === 0);

    const autoCode = `EMP-${String(employees.length + 1).padStart(3, '0')}`;

    setEmpForm({
      employee_code: autoCode,
      full_name: '',
      nickname: '',
      phone: '',
      email: '',
      address: '',
      join_date: new Date().toISOString().split('T')[0],
      employment_status: 'ACTIVE',
      branch_id: branches.length > 0 ? branches[0].id : '',
      manual_branch_name: '',
      division_id: divisions.length > 0 ? divisions[0].id : '',
      manual_division_name: '',
      position_id: positions.length > 0 ? positions[0].id : '',
      manual_position_name: '',
      supervisor_id: '',
      auth_user_id: '',
      base_salary: '',
      incentive_rate: '',
    });
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsCustomPosition(false);
    setIsCustomDivision(false);
    setIsCustomBranch(false);

    setEmpForm({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      nickname: emp.nickname || '',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      join_date: emp.join_date || new Date().toISOString().split('T')[0],
      employment_status: emp.employment_status || 'ACTIVE',
      branch_id: emp.branch_id || '',
      manual_branch_name: '',
      division_id: emp.division_id || '',
      manual_division_name: '',
      position_id: emp.position_id || '',
      manual_position_name: '',
      supervisor_id: emp.supervisor_id || '',
      auth_user_id: emp.auth_user_id || '',
      base_salary: emp.base_salary !== null && emp.base_salary !== undefined ? emp.base_salary : '',
      incentive_rate: emp.incentive_rate !== null && emp.incentive_rate !== undefined ? emp.incentive_rate : '',
    });
    setShowEmployeeModal(true);
  };

  // Save Employee Handler
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);

    try {
      let finalBranchId = empForm.branch_id;
      let finalDivId = empForm.division_id;
      let finalPosId = empForm.position_id;

      // Handle Manual Branch Creation if typed manually
      if ((isCustomBranch || !finalBranchId) && empForm.manual_branch_name.trim()) {
        const createdBranch = await PeopleRepository.createBranch(businessId, {
          name: empForm.manual_branch_name.trim(),
          code: `BR-${Date.now().toString().slice(-4)}`,
        });
        finalBranchId = createdBranch.id;
      }

      // Handle Manual Division Creation if typed manually
      if ((isCustomDivision || !finalDivId) && empForm.manual_division_name.trim()) {
        const createdDiv = await PeopleRepository.createDivision({
          business_id: businessId,
          code: `DIV-${Date.now().toString().slice(-4)}`,
          name: empForm.manual_division_name.trim(),
        });
        finalDivId = createdDiv.id;
      }

      // Handle Manual Position Creation if typed manually
      if ((isCustomPosition || !finalPosId) && empForm.manual_position_name.trim()) {
        const createdPos = await PeopleRepository.createPosition({
          business_id: businessId,
          division_id: finalDivId || 'div-001',
          code: `POS-${Date.now().toString().slice(-4)}`,
          name: empForm.manual_position_name.trim(),
        });
        finalPosId = createdPos.id;
      }

      if (editingEmployee) {
        await PeopleRepository.updateEmployee(editingEmployee.id, {
          full_name: empForm.full_name,
          nickname: empForm.nickname,
          phone: empForm.phone,
          email: empForm.email,
          address: empForm.address,
          join_date: empForm.join_date,
          employment_status: empForm.employment_status,
          branch_id: finalBranchId,
          division_id: finalDivId,
          position_id: finalPosId,
          supervisor_id: empForm.supervisor_id,
          auth_user_id: empForm.auth_user_id,
          base_salary: empForm.base_salary === '' ? undefined : Number(empForm.base_salary),
          incentive_rate: empForm.incentive_rate === '' ? undefined : Number(empForm.incentive_rate),
        });
        setFeedback({ type: 'success', text: `Data pegawai ${empForm.full_name} berhasil diperbarui.` });
      } else {
        await PeopleRepository.createEmployee({
          business_id: businessId,
          employee_code: empForm.employee_code,
          full_name: empForm.full_name,
          nickname: empForm.nickname,
          phone: empForm.phone,
          email: empForm.email,
          address: empForm.address,
          join_date: empForm.join_date,
          employment_status: empForm.employment_status,
          branch_id: finalBranchId,
          division_id: finalDivId,
          position_id: finalPosId,
          supervisor_id: empForm.supervisor_id,
          auth_user_id: empForm.auth_user_id,
          base_salary: empForm.base_salary === '' ? undefined : Number(empForm.base_salary),
          incentive_rate: empForm.incentive_rate === '' ? undefined : Number(empForm.incentive_rate),
        });
        setFeedback({ type: 'success', text: `Pegawai baru ${empForm.full_name} berhasil ditambahkan.` });
      }

      setShowEmployeeModal(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan data pegawai.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Branch Handler
  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (editingBranch) {
        await PeopleRepository.updateBranch(editingBranch.id, businessId, {
          name: branchForm.name,
          code: branchForm.code,
          address: branchForm.address,
        });
        setFeedback({ type: 'success', text: `Data cabang ${branchForm.name} berhasil diperbarui.` });
      } else {
        await PeopleRepository.createBranch(businessId, {
          name: branchForm.name,
          code: branchForm.code,
          address: branchForm.address,
        });
        setFeedback({ type: 'success', text: `Cabang baru ${branchForm.name} berhasil ditambahkan.` });
      }
      setShowBranchModal(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan data cabang.' });
    }
  };

  // Save Division Handler
  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (editingDivision) {
        await PeopleRepository.updateDivision(editingDivision.id, {
          name: divForm.name,
          description: divForm.description,
        });
        setFeedback({ type: 'success', text: `Divisi ${divForm.name} berhasil diperbarui.` });
      } else {
        await PeopleRepository.createDivision({
          business_id: businessId,
          code: divForm.code,
          name: divForm.name,
          description: divForm.description,
        });
        setFeedback({ type: 'success', text: `Divisi baru ${divForm.name} berhasil dibuat.` });
      }
      setShowDivisionModal(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan divisi.' });
    }
  };

  // Save Position Handler
  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (editingPosition) {
        await PeopleRepository.updatePosition(editingPosition.id, {
          name: posForm.name,
          division_id: posForm.division_id,
          level: posForm.level,
          description: posForm.description,
        });
        setFeedback({ type: 'success', text: `Jabatan ${posForm.name} berhasil diperbarui.` });
      } else {
        await PeopleRepository.createPosition({
          business_id: businessId,
          division_id: posForm.division_id || 'div-001',
          code: posForm.code,
          name: posForm.name,
          level: posForm.level,
          description: posForm.description,
        });
        setFeedback({ type: 'success', text: `Jabatan baru ${posForm.name} berhasil dibuat.` });
      }
      setShowPositionModal(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Gagal menyimpan jabatan.' });
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 space-y-6 font-sans">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Manajemen Pegawai, Master Data & Cabang Organisasi
          </h1>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('EMPLOYEE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'EMPLOYEE' ? 'bg-[#F26522] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            👤 Input & Data Pegawai
          </button>
          <button
            onClick={() => setActiveTab('BRANCH')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'BRANCH' ? 'bg-[#F26522] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏢 Master Cabang
          </button>
          <button
            onClick={() => setActiveTab('DIVISION')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'DIVISION' ? 'bg-[#F26522] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📁 Divisi
          </button>
          <button
            onClick={() => setActiveTab('POSITION')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'POSITION' ? 'bg-[#F26522] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🏷️ Jabatan
          </button>
          <button
            onClick={() => setActiveTab('PRESENSI')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'PRESENSI' ? 'bg-[#F26522] text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📅 Presensi
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between ${
          feedback.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75">✕</button>
        </div>
      )}

      {/* TAB 1: EMPLOYEE MANAGEMENT & MANUAL INPUT */}
      {activeTab === 'EMPLOYEE' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <input
                type="text"
                placeholder="Cari nama, NIP, HP, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#F26522] min-w-[200px]"
              />

              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">Semua Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={filterDivision}
                onChange={e => setFilterDivision(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs font-semibold"
              >
                <option value="ALL">Semua Divisi</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenAddEmployee}
              className="bg-[#10B981] hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <span>+ Input Master Pegawai</span>
            </button>
          </div>

          {/* Employee Table */}
          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold">
                  <th className="p-3">NIP / Kode</th>
                  <th className="p-3">Nama Pegawai & Kontak</th>
                  <th className="p-3">Jabatan & Divisi</th>
                  <th className="p-3">Cabang Organisasi</th>
                  <th className="p-3">Gaji & Insentif</th>
                  <th className="p-3">Atasan / Supervisor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-semibold">Memuat data pegawai...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400 font-semibold">Belum ada data pegawai. Klik "+ Input Master Pegawai" untuk menambahkan pegawai secara manual.</td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-900/50 transition-colors text-slate-200">
                      <td className="p-3 font-mono font-bold text-blue-400">{emp.employee_code}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{emp.full_name}</div>
                        <div className="text-[11px] text-slate-400">{emp.phone || '-'} • {emp.email || '-'}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-emerald-400">{emp.position_name || '-'}</div>
                        <div className="text-[11px] text-slate-400">{emp.division_name || '-'}</div>
                      </td>
                      <td className="p-3 font-semibold text-amber-400">{emp.branch_name || '-'}</td>
                      <td className="p-3">
                        <div className="font-bold text-emerald-400">Rp {emp.base_salary ? emp.base_salary.toLocaleString('id-ID') : '0'}</div>
                        <div className="text-[11px] text-blue-400">Insentif: Rp {emp.incentive_rate ? emp.incentive_rate.toLocaleString('id-ID') : '0'}</div>
                      </td>
                      <td className="p-3 text-slate-300">{emp.supervisor_name || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          emp.employment_status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {emp.employment_status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleOpenEditEmployee(emp)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700 transition-all"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MASTER CABANG */}
      {activeTab === 'BRANCH' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Daftar & Master Cabang Organisasi</h2>
            <button
              onClick={() => {
                setEditingBranch(null);
                setBranchForm({ code: `BR-${Date.now().toString().slice(-4)}`, name: '', address: '' });
                setShowBranchModal(true);
              }}
              className="bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              + Tambah Cabang Baru
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold">
                  <th className="p-3">Kode Cabang</th>
                  <th className="p-3">Nama Cabang</th>
                  <th className="p-3">Alamat Cabang</th>
                  <th className="p-3">Jumlah Pegawai</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">Belum ada cabang. Tambahkan cabang pertama Anda.</td>
                  </tr>
                ) : (
                  branches.map(b => {
                    const empCount = employees.filter(e => e.branch_id === b.id).length;
                    return (
                      <tr key={b.id} className="hover:bg-slate-900/50 text-slate-200">
                        <td className="p-3 font-mono font-bold text-amber-400">{b.code || 'BR-001'}</td>
                        <td className="p-3 font-bold text-white">{b.name}</td>
                        <td className="p-3 text-slate-400">{b.address || '-'}</td>
                        <td className="p-3 font-bold text-emerald-400">{empCount} Orang</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setEditingBranch(b);
                              setBranchForm({ code: b.code || '', name: b.name, address: b.address || '' });
                              setShowBranchModal(true);
                            }}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700"
                          >
                            Edit Cabang
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
      )}

      {/* TAB 3: DIVISI */}
      {activeTab === 'DIVISION' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Daftar Divisi Organisasi</h2>
            <button
              onClick={() => {
                setEditingDivision(null);
                setDivForm({ code: `DIV-${Date.now().toString().slice(-4)}`, name: '', description: '' });
                setShowDivisionModal(true);
              }}
              className="bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              + Tambah Divisi Baru
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold">
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Divisi</th>
                  <th className="p-3">Deskripsi</th>
                  <th className="p-3">Jumlah Pegawai</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {divisions.map(d => {
                  const empCount = employees.filter(e => e.division_id === d.id).length;
                  return (
                    <tr key={d.id} className="hover:bg-slate-900/50 text-slate-200">
                      <td className="p-3 font-mono font-bold text-blue-400">{d.code}</td>
                      <td className="p-3 font-bold text-white">{d.name}</td>
                      <td className="p-3 text-slate-400">{d.description || '-'}</td>
                      <td className="p-3 font-bold text-emerald-400">{empCount} Orang</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setEditingDivision(d);
                            setDivForm({ code: d.code, name: d.name, description: d.description || '' });
                            setShowDivisionModal(true);
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: JABATAN */}
      {activeTab === 'POSITION' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Daftar Jabatan Organisasi</h2>
            <button
              onClick={() => {
                setEditingPosition(null);
                setPosForm({ code: `POS-${Date.now().toString().slice(-4)}`, name: '', division_id: divisions[0]?.id || '', level: 'Staff', description: '' });
                setShowPositionModal(true);
              }}
              className="bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl"
            >
              + Tambah Jabatan Baru
            </button>
          </div>

          <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-900 text-slate-400 border-b border-slate-800 font-bold">
                  <th className="p-3">Kode</th>
                  <th className="p-3">Nama Jabatan</th>
                  <th className="p-3">Level</th>
                  <th className="p-3">Jumlah Pegawai</th>
                  <th className="p-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {positions.map(p => {
                  const empCount = employees.filter(e => e.position_id === p.id).length;
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/50 text-slate-200">
                      <td className="p-3 font-mono font-bold text-blue-400">{p.code}</td>
                      <td className="p-3 font-bold text-white">{p.name}</td>
                      <td className="p-3 text-slate-400">{p.level || '-'}</td>
                      <td className="p-3 font-bold text-emerald-400">{empCount} Orang</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setEditingPosition(p);
                            setPosForm({ code: p.code, name: p.name, division_id: p.division_id, level: p.level || '', description: p.description || '' });
                            setShowPositionModal(true);
                          }}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg border border-slate-700"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PRESENSI */}
      {activeTab === 'PRESENSI' && (
        <PresensiModule businessId={businessId} branchId={branchId} actorUserId={actorUserId} actorRole={actorRole} />
      )}

      {/* MODAL: INPUT / EDIT PEGAWAI */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <h2 className="text-base font-extrabold text-white">
              {editingEmployee ? 'Edit Data Pegawai' : 'Input Master Data Pegawai Baru'}
            </h2>

            <form onSubmit={handleSaveEmployee} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">NIP / Kode Pegawai *</label>
                  <input
                    type="text"
                    required
                    value={empForm.employee_code}
                    onChange={e => setEmpForm({ ...empForm, employee_code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={empForm.full_name}
                    onChange={e => setEmpForm({ ...empForm, full_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Nama Panggilan</label>
                  <input
                    type="text"
                    value={empForm.nickname}
                    onChange={e => setEmpForm({ ...empForm, nickname: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    value={empForm.phone}
                    onChange={e => setEmpForm({ ...empForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Email</label>
                  <input
                    type="email"
                    value={empForm.email}
                    onChange={e => setEmpForm({ ...empForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl"
                  />
                </div>
              </div>

              {/* Jabatan (Position) Input / Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-bold">Jabatan *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomPosition(!isCustomPosition)}
                    className="text-[11px] text-[#F26522] font-bold hover:underline"
                  >
                    {isCustomPosition ? '← Pilih dari Master' : '+ Input Custom Jabatan'}
                  </button>
                </div>

                {!isCustomPosition && positions.length > 0 ? (
                  <select
                    value={empForm.position_id}
                    onChange={e => setEmpForm({ ...empForm, position_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  >
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ketik Nama Jabatan Manual (misal: Supervisor Operasional)"
                    value={empForm.manual_position_name}
                    onChange={e => setEmpForm({ ...empForm, manual_position_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  />
                )}
              </div>

              {/* Divisi Input / Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-bold">Bagian / Divisi</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomDivision(!isCustomDivision)}
                    className="text-[11px] text-[#F26522] font-bold hover:underline"
                  >
                    {isCustomDivision ? '← Pilih dari Master' : '+ Input Custom Divisi'}
                  </button>
                </div>

                {!isCustomDivision && divisions.length > 0 ? (
                  <select
                    value={empForm.division_id}
                    onChange={e => setEmpForm({ ...empForm, division_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  >
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Ketik Nama Divisi Manual (misal: Divisi Care & Maintenance)"
                    value={empForm.manual_division_name}
                    onChange={e => setEmpForm({ ...empForm, manual_division_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  />
                )}
              </div>

              {/* Cabang Input / Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-400 font-bold">Cabang Penempatan *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomBranch(!isCustomBranch)}
                    className="text-[11px] text-[#F26522] font-bold hover:underline"
                  >
                    {isCustomBranch ? '← Pilih dari Master' : '+ Input Custom Cabang'}
                  </button>
                </div>

                {!isCustomBranch && branches.length > 0 ? (
                  <select
                    value={empForm.branch_id}
                    onChange={e => setEmpForm({ ...empForm, branch_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Ketik Nama Cabang Manual (misal: Cabang Bogor Central)"
                    value={empForm.manual_branch_name}
                    onChange={e => setEmpForm({ ...empForm, manual_branch_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  />
                )}
              </div>

              {/* Atasan & Status Kepegawaian */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Atasan Direct (Supervisor)</label>
                  <select
                    value={empForm.supervisor_id}
                    onChange={e => setEmpForm({ ...empForm, supervisor_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl"
                  >
                    <option value="">-- Tanpa Atasan Direct --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold block mb-1">Status Kepegawaian</label>
                  <select
                    value={empForm.employment_status}
                    onChange={e => setEmpForm({ ...empForm, employment_status: e.target.value as EmploymentStatus })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="RESIGNED">RESIGNED</option>
                  </select>
                </div>
              </div>

              {/* Salary & Incentive Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Gaji Pokok (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 4500000"
                    value={empForm.base_salary}
                    onChange={e => setEmpForm({ ...empForm, base_salary: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Incentive Rate (Rp per SPK)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 15000"
                    value={empForm.incentive_rate}
                    onChange={e => setEmpForm({ ...empForm, incentive_rate: e.target.value === '' ? '' : Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT / EDIT CABANG */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">
              {editingBranch ? 'Edit Data Cabang' : 'Tambah Cabang Baru'}
            </h2>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Kode Cabang *</label>
                <input
                  type="text"
                  required
                  value={branchForm.code}
                  onChange={e => setBranchForm({ ...branchForm, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Nama Cabang *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Cabang Bogor Central"
                  value={branchForm.name}
                  onChange={e => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Alamat Cabang</label>
                <input
                  type="text"
                  placeholder="Jl. Pajajaran No. 88, Bogor"
                  value={branchForm.address}
                  onChange={e => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBranchModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md"
                >
                  Simpan Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT / EDIT DIVISI */}
      {showDivisionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">
              {editingDivision ? 'Edit Divisi' : 'Tambah Divisi Baru'}
            </h2>
            <form onSubmit={handleSaveDivision} className="space-y-4">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Kode Divisi *</label>
                <input
                  type="text"
                  required
                  value={divForm.code}
                  onChange={e => setDivForm({ ...divForm, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Nama Divisi *</label>
                <input
                  type="text"
                  required
                  value={divForm.name}
                  onChange={e => setDivForm({ ...divForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={divForm.description}
                  onChange={e => setDivForm({ ...divForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowDivisionModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl">Batal</button>
                <button type="submit" className="px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md">Simpan Divisi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INPUT / EDIT JABATAN */}
      {showPositionModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 text-xs">
            <h2 className="text-base font-bold text-white">
              {editingPosition ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
            </h2>
            <form onSubmit={handleSavePosition} className="space-y-4">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Kode Jabatan *</label>
                <input
                  type="text"
                  required
                  value={posForm.code}
                  onChange={e => setPosForm({ ...posForm, code: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Nama Jabatan *</label>
                <input
                  type="text"
                  required
                  value={posForm.name}
                  onChange={e => setPosForm({ ...posForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl font-bold"
                />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Divisi Induk</label>
                <select
                  value={posForm.division_id}
                  onChange={e => setPosForm({ ...posForm, division_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl"
                >
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowPositionModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-xl">Batal</button>
                <button type="submit" className="px-5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md">Simpan Jabatan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
