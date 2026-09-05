'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Employee, Division, Position, EmploymentStatus,
  CreateDivisionDTO, CreatePositionDTO, CreateEmployeeDTO, UpdateEmployeeDTO 
} from '@/domains/people/people.types';
import { PeopleRepository } from '@/domains/people/peopleRepository';
import { PeopleDomainService } from '@/domains/people/peopleDomainService';
import { PEOPLE_PERMISSIONS } from '@/domains/people/peoplePermissions';

interface PeopleManagementDashboardProps {
  businessId: string;
  branchId?: string;
  actorUserId: string;
  actorRole: 'OWNER' | 'KEPALA_CABANG' | 'PEGAWAI';
  actorPermissions?: string[];
}

export function PeopleManagementDashboard({
  businessId,
  branchId,
  actorUserId,
  actorRole,
  actorPermissions = [],
}: PeopleManagementDashboardProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'EMPLOYEE' | 'DIVISION' | 'POSITION'>('EMPLOYEE');

  // Master Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [authUsers, setAuthUsers] = useState<{ user_id: string; email: string; role_name?: string }[]>([]);

  // Loading & Notification States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search & Filter States for Employee List
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterDivision, setFilterDivision] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterAuthLinked, setFilterAuthLinked] = useState<string>('ALL');

  // Modal States
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showDivisionModal, setShowDivisionModal] = useState<boolean>(false);
  const [editingDivision, setEditingDivision] = useState<Division | null>(null);

  const [showPositionModal, setShowPositionModal] = useState<boolean>(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

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
    division_id: string;
    position_id: string;
    supervisor_id: string;
    auth_user_id: string;
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
    division_id: '',
    position_id: '',
    supervisor_id: '',
    auth_user_id: '',
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

  // Permission Checks
  const canView = useMemo(() => {
    if (actorRole === 'OWNER' || actorRole === 'KEPALA_CABANG') return true;
    return actorPermissions.includes(PEOPLE_PERMISSIONS.VIEW) || actorPermissions.includes('people:employee:view');
  }, [actorRole, actorPermissions]);

  const canCreate = useMemo(() => {
    if (actorRole === 'OWNER' || actorRole === 'KEPALA_CABANG') return true;
    return actorPermissions.includes(PEOPLE_PERMISSIONS.CREATE) || actorPermissions.includes('people:employee:create');
  }, [actorRole, actorPermissions]);

  const canUpdate = useMemo(() => {
    if (actorRole === 'OWNER' || actorRole === 'KEPALA_CABANG') return true;
    return actorPermissions.includes(PEOPLE_PERMISSIONS.UPDATE) || actorPermissions.includes('people:employee:update');
  }, [actorRole, actorPermissions]);

  // Load Data
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
      setError(err.message || 'Gagal memuat data People Domain');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Hydrated lookups
  const hydratedEmployees = useMemo(() => {
    const divMap = new Map(divisions.map(d => [d.id, d.name]));
    const posMap = new Map(positions.map(p => [p.id, p.name]));
    const branchMap = new Map(branches.map(b => [b.id, b.name]));
    const empNameMap = new Map(employees.map(e => [e.id, e.full_name]));

    return employees.map(e => ({
      ...e,
      division_name: e.division_id ? divMap.get(e.division_id) || '-' : '-',
      position_name: e.position_id ? posMap.get(e.position_id) || '-' : '-',
      branch_name: e.branch_id ? branchMap.get(e.branch_id) || '-' : 'Cabang Utama',
      supervisor_name: e.supervisor_id ? empNameMap.get(e.supervisor_id) || '-' : '-',
    }));
  }, [employees, divisions, positions, branches]);

  // Filtered Employees (RLS remains authoritative for data access security)
  const filteredEmployees = useMemo(() => {
    return hydratedEmployees.filter(e => {
      // Presentation filter by branch dropdown (optional filter over RLS-authorized data)
      if (filterBranch !== 'ALL' && e.branch_id !== filterBranch) return false;
      if (filterDivision !== 'ALL' && e.division_id !== filterDivision) return false;
      if (filterPosition !== 'ALL' && e.position_id !== filterPosition) return false;
      if (filterStatus !== 'ALL' && e.employment_status !== filterStatus) return false;

      if (filterAuthLinked === 'LINKED' && !e.auth_user_id) return false;
      if (filterAuthLinked === 'UNLINKED' && e.auth_user_id) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = e.full_name.toLowerCase().includes(q);
        const matchCode = e.employee_code.toLowerCase().includes(q);
        const matchNickname = e.nickname ? e.nickname.toLowerCase().includes(q) : false;
        if (!matchName && !matchCode && !matchNickname) return false;
      }
      return true;
    });
  }, [hydratedEmployees, searchQuery, filterBranch, filterDivision, filterPosition, filterStatus, filterAuthLinked]);

  // Position employee counts
  const positionEmployeeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach(e => {
      if (e.position_id) {
        counts.set(e.position_id, (counts.get(e.position_id) || 0) + 1);
      }
    });
    return counts;
  }, [employees]);

  // Division employee counts
  const divisionEmployeeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    employees.forEach(e => {
      if (e.division_id) {
        counts.set(e.division_id, (counts.get(e.division_id) || 0) + 1);
      }
    });
    return counts;
  }, [employees]);

  // Handlers: Division
  const handleOpenAddDivision = () => {
    setEditingDivision(null);
    setDivForm({ code: `DIV-00${divisions.length + 1}`, name: '', description: '' });
    setShowDivisionModal(true);
  };

  const handleOpenEditDivision = (div: Division) => {
    setEditingDivision(div);
    setDivForm({ code: div.code, name: div.name, description: div.description || '' });
    setShowDivisionModal(true);
  };

  const handleSaveDivision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDivision) {
        await PeopleRepository.updateDivision(editingDivision.id, {
          name: divForm.name,
          description: divForm.description,
        });
        setFeedback({ type: 'success', text: `Divisi '${divForm.name}' berhasil diperbarui.` });
      } else {
        await PeopleDomainService.createDivision(actorUserId, {
          business_id: businessId,
          code: divForm.code,
          name: divForm.name,
          description: divForm.description,
        });
        setFeedback({ type: 'success', text: `Divisi baru '${divForm.name}' berhasil dibuat.` });
      }
      setShowDivisionModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  // Handlers: Position
  const handleOpenAddPosition = () => {
    setEditingPosition(null);
    setPosForm({
      code: `POS-00${positions.length + 1}`,
      name: '',
      division_id: divisions.length > 0 ? divisions[0].id : '',
      level: 'STAFF',
      description: '',
    });
    setShowPositionModal(true);
  };

  const handleOpenEditPosition = (pos: Position) => {
    setEditingPosition(pos);
    setPosForm({
      code: pos.code,
      name: pos.name,
      division_id: pos.division_id,
      level: pos.level || 'STAFF',
      description: pos.description || '',
    });
    setShowPositionModal(true);
  };

  const handleSavePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPosition) {
        await PeopleRepository.updatePosition(editingPosition.id, {
          division_id: posForm.division_id,
          name: posForm.name,
          level: posForm.level,
          description: posForm.description,
        });
        setFeedback({ type: 'success', text: `Jabatan '${posForm.name}' berhasil diperbarui.` });
      } else {
        await PeopleDomainService.createPosition(actorUserId, {
          business_id: businessId,
          division_id: posForm.division_id,
          code: posForm.code,
          name: posForm.name,
          level: posForm.level,
          description: posForm.description,
        });
        setFeedback({ type: 'success', text: `Jabatan baru '${posForm.name}' berhasil dibuat.` });
      }
      setShowPositionModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  // Handlers: Employee
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({
      employee_code: `EMP-00${employees.length + 1}`,
      full_name: '',
      nickname: '',
      phone: '',
      email: '',
      address: '',
      join_date: new Date().toISOString().split('T')[0],
      employment_status: 'ACTIVE',
      branch_id: branches.length > 0 ? branches[0].id : '',
      division_id: divisions.length > 0 ? divisions[0].id : '',
      position_id: positions.length > 0 ? positions[0].id : '',
      supervisor_id: '',
      auth_user_id: '',
    });
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpForm({
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      nickname: emp.nickname || '',
      phone: emp.phone || '',
      email: emp.email || '',
      address: emp.address || '',
      join_date: emp.join_date || new Date().toISOString().split('T')[0],
      employment_status: emp.employment_status,
      branch_id: emp.branch_id || '',
      division_id: emp.division_id || '',
      position_id: emp.position_id || '',
      supervisor_id: emp.supervisor_id || '',
      auth_user_id: emp.auth_user_id || '',
    });
    setShowEmployeeModal(true);
  };

  const handlePositionChangeInForm = (posId: string) => {
    const selectedPos = positions.find(p => p.id === posId);
    setEmpForm(prev => ({
      ...prev,
      position_id: posId,
      division_id: selectedPos ? selectedPos.division_id : prev.division_id,
    }));
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmployee) {
        await PeopleDomainService.updateEmployee(actorUserId, editingEmployee.id, {
          full_name: empForm.full_name,
          nickname: empForm.nickname || undefined,
          phone: empForm.phone || undefined,
          email: empForm.email || undefined,
          address: empForm.address || undefined,
          join_date: empForm.join_date || undefined,
          employment_status: empForm.employment_status,
          branch_id: empForm.branch_id || undefined,
          division_id: empForm.division_id || undefined,
          position_id: empForm.position_id || undefined,
          supervisor_id: empForm.supervisor_id || undefined,
        });
        setFeedback({ type: 'success', text: `Data pegawai '${empForm.full_name}' berhasil diperbarui.` });
      } else {
        await PeopleDomainService.createEmployee(actorUserId, {
          business_id: businessId,
          employee_code: empForm.employee_code,
          full_name: empForm.full_name,
          nickname: empForm.nickname || undefined,
          phone: empForm.phone || undefined,
          email: empForm.email || undefined,
          address: empForm.address || undefined,
          join_date: empForm.join_date || undefined,
          employment_status: empForm.employment_status,
          branch_id: empForm.branch_id || undefined,
          division_id: empForm.division_id || undefined,
          position_id: empForm.position_id || undefined,
          supervisor_id: empForm.supervisor_id || undefined,
          auth_user_id: empForm.auth_user_id || undefined,
        });
        setFeedback({ type: 'success', text: `Pegawai baru '${empForm.full_name}' berhasil didaftarkan.` });
      }
      setShowEmployeeModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  const handleStatusChange = async (emp: Employee, newStatus: EmploymentStatus) => {
    if (!window.confirm(`Apakah Anda yakin ingin mengubah status '${emp.full_name}' menjadi '${newStatus}'?`)) {
      return;
    }
    try {
      if (newStatus === 'RESIGNED') {
        await PeopleDomainService.resignEmployee(actorUserId, emp.id);
      } else if (newStatus === 'INACTIVE') {
        await PeopleDomainService.deactivateEmployee(actorUserId, emp.id);
      } else if (newStatus === 'ACTIVE') {
        await PeopleDomainService.activateEmployee(actorUserId, emp.id);
      }
      setFeedback({ type: 'success', text: `Status '${emp.full_name}' diperbarui menjadi ${newStatus}.` });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message });
    }
  };

  if (!canView) {
    return (
      <div style={{ padding: '32px', background: '#090d16', minHeight: '100vh', color: '#f8fafc' }}>
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', padding: '20px', borderRadius: '8px', color: '#fca5a5' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Akses Dibatasi</h2>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>Anda tidak memiliki izin (people:employee:view) untuk mengakses kelola pegawai organisasi.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#090d16', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: '#ffffff' }}>Manajemen Pegawai Organisasi</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#1e293b', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('EMPLOYEE')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              background: activeTab === 'EMPLOYEE' ? '#2563eb' : 'transparent',
              color: activeTab === 'EMPLOYEE' ? '#ffffff' : '#94a3b8',
            }}
          >
            Pegawai ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('DIVISION')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              background: activeTab === 'DIVISION' ? '#2563eb' : 'transparent',
              color: activeTab === 'DIVISION' ? '#ffffff' : '#94a3b8',
            }}
          >
            Divisi ({divisions.length})
          </button>
          <button
            onClick={() => setActiveTab('POSITION')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              background: activeTab === 'POSITION' ? '#2563eb' : 'transparent',
              color: activeTab === 'POSITION' ? '#ffffff' : '#94a3b8',
            }}
          >
            Jabatan ({positions.length})
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '20px',
          background: feedback.type === 'success' ? '#064e3b' : '#7f1d1d',
          border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
          color: feedback.type === 'success' ? '#a7f3d0' : '#fca5a5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
        }}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', background: '#7f1d1d', border: '1px solid #ef4444', color: '#fca5a5', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* TAB 1: EMPLOYEE MANAGEMENT */}
      {activeTab === 'EMPLOYEE' && (
        <div>
          {/* Action & Filter Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1 }}>
              <input
                type="text"
                placeholder="Cari NIP / Nama Pegawai..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', width: '220px' }}
              />

              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="ALL">Semua Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select
                value={filterDivision}
                onChange={e => setFilterDivision(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="ALL">Semua Divisi</option>
                {divisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              <select
                value={filterPosition}
                onChange={e => setFilterPosition(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="ALL">Semua Jabatan</option>
                {positions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="RESIGNED">RESIGNED</option>
              </select>

              <select
                value={filterAuthLinked}
                onChange={e => setFilterAuthLinked(e.target.value)}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="ALL">Status Akun Auth</option>
                <option value="LINKED">Tersambung (LINKED)</option>
                <option value="UNLINKED">Belum Tersambung</option>
              </select>
            </div>

            {canCreate && (
              <button
                onClick={handleOpenAddEmployee}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                + Tambah Pegawai
              </button>
            )}
          </div>

          {/* Employee Table */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>NIP / Kode</th>
                  <th style={{ padding: '12px 16px' }}>Nama Pegawai</th>
                  <th style={{ padding: '12px 16px' }}>Jabatan & Divisi</th>
                  <th style={{ padding: '12px 16px' }}>Cabang</th>
                  <th style={{ padding: '12px 16px' }}>Atasan (Supervisor)</th>
                  <th style={{ padding: '12px 16px' }}>Akun Auth</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Memuat data pegawai...</td>
                  </tr>
                ) : filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>Tidak ada data pegawai yang sesuai.</td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #1e293b', color: '#f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'monospace', color: '#60a5fa' }}>{emp.employee_code}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 'bold' }}>{emp.full_name}</div>
                        {emp.nickname && <div style={{ fontSize: '11px', color: '#94a3b8' }}>Alias: {emp.nickname}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#f8fafc', fontWeight: '500' }}>{emp.position_name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.division_name}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{emp.branch_name}</td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{emp.supervisor_name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {emp.auth_user_id ? (
                          <span style={{ background: '#064e3b', color: '#6ee7b7', border: '1px solid #047857', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                            LINKED
                          </span>
                        ) : (
                          <span style={{ background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>
                            NOT LINKED
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {emp.employment_status === 'ACTIVE' && (
                          <span style={{ background: '#14532d', color: '#86efac', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>ACTIVE</span>
                        )}
                        {emp.employment_status === 'INACTIVE' && (
                          <span style={{ background: '#78350f', color: '#fde68a', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>INACTIVE</span>
                        )}
                        {emp.employment_status === 'RESIGNED' && (
                          <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>RESIGNED</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {canUpdate && (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleOpenEditEmployee(emp)}
                              style={{ background: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                            >
                              Edit
                            </button>
                            {emp.employment_status === 'ACTIVE' && (
                              <button
                                onClick={() => handleStatusChange(emp, 'INACTIVE')}
                                style={{ background: '#78350f', color: '#fde68a', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                              >
                                Nonaktifkan
                              </button>
                            )}
                            {emp.employment_status === 'INACTIVE' && (
                              <button
                                onClick={() => handleStatusChange(emp, 'ACTIVE')}
                                style={{ background: '#14532d', color: '#86efac', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                              >
                                Aktifkan
                              </button>
                            )}
                            {emp.employment_status !== 'RESIGNED' && (
                              <button
                                onClick={() => handleStatusChange(emp, 'RESIGNED')}
                                style={{ background: '#7f1d1d', color: '#fca5a5', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                              >
                                Resign
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DIVISION MANAGEMENT */}
      {activeTab === 'DIVISION' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Daftar Divisi Organisasi</h2>
            {canCreate && (
              <button
                onClick={handleOpenAddDivision}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                + Tambah Divisi
              </button>
            )}
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>Kode</th>
                  <th style={{ padding: '12px 16px' }}>Nama Divisi</th>
                  <th style={{ padding: '12px 16px' }}>Deskripsi</th>
                  <th style={{ padding: '12px 16px' }}>Jumlah Pegawai</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {divisions.map(div => (
                  <tr key={div.id} style={{ borderBottom: '1px solid #1e293b', color: '#f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'monospace', color: '#60a5fa' }}>{div.code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{div.name}</td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{div.description || '-'}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#fbbf24' }}>{divisionEmployeeCounts.get(div.id) || 0} Orang</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: div.is_active ? '#14532d' : '#7f1d1d', color: div.is_active ? '#86efac' : '#fca5a5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {div.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {canUpdate && (
                        <button
                          onClick={() => handleOpenEditDivision(div)}
                          style={{ background: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: POSITION / JABATAN MANAGEMENT */}
      {activeTab === 'POSITION' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Daftar Jabatan Organisasi</h2>
            {canCreate && (
              <button
                onClick={handleOpenAddPosition}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                + Tambah Jabatan
              </button>
            )}
          </div>

          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px' }}>Kode</th>
                  <th style={{ padding: '12px 16px' }}>Nama Jabatan</th>
                  <th style={{ padding: '12px 16px' }}>Divisi Induk</th>
                  <th style={{ padding: '12px 16px' }}>Level</th>
                  <th style={{ padding: '12px 16px' }}>Jumlah Pegawai</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const divName = divisions.find(d => d.id === pos.division_id)?.name || '-';
                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid #1e293b', color: '#f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', fontFamily: 'monospace', color: '#60a5fa' }}>{pos.code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{pos.name}</td>
                      <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{divName}</td>
                      <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{pos.level || '-'}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#fbbf24' }}>{positionEmployeeCounts.get(pos.id) || 0} Orang</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: pos.is_active ? '#14532d' : '#7f1d1d', color: pos.is_active ? '#86efac' : '#fca5a5', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          {pos.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {canUpdate && (
                          <button
                            onClick={() => handleOpenEditPosition(pos)}
                            style={{ background: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT EMPLOYEE */}
      {showEmployeeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0', color: '#fff' }}>
              {editingEmployee ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
            </h2>
            <form onSubmit={handleSaveEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>NIP / Kode Pegawai *</label>
                  <input
                    type="text"
                    required
                    value={empForm.employee_code}
                    disabled={!!editingEmployee}
                    onChange={e => setEmpForm({ ...empForm, employee_code: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={empForm.full_name}
                    onChange={e => setEmpForm({ ...empForm, full_name: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Jabatan (Position) *</label>
                  <select
                    required
                    value={empForm.position_id}
                    onChange={e => handlePositionChangeInForm(e.target.value)}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="">-- Pilih Jabatan --</option>
                    {positions.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Divisi</label>
                  <select
                    value={empForm.division_id}
                    onChange={e => setEmpForm({ ...empForm, division_id: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="">-- Pilih Divisi --</option>
                    {divisions.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Cabang Organisasi</label>
                  <select
                    value={empForm.branch_id}
                    onChange={e => setEmpForm({ ...empForm, branch_id: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Atasan Langsung (Supervisor)</label>
                  <select
                    value={empForm.supervisor_id}
                    onChange={e => setEmpForm({ ...empForm, supervisor_id: e.target.value })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="">-- Tanpa Atasan --</option>
                    {employees
                      .filter(e => e.id !== editingEmployee?.id && e.employment_status === 'ACTIVE')
                      .map(e => (
                        <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Status Kepegawaian</label>
                  <select
                    value={empForm.employment_status}
                    onChange={e => setEmpForm({ ...empForm, employment_status: e.target.value as EmploymentStatus })}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="RESIGNED">RESIGNED</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tautkan Akun Auth Login</label>
                  <select
                    value={empForm.auth_user_id}
                    onChange={e => setEmpForm({ ...empForm, auth_user_id: e.target.value })}
                    disabled={!!editingEmployee}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="">-- Tanpa Akun Login (Offline Worker) --</option>
                    {authUsers.map(u => (
                      <option key={u.user_id} value={u.user_id}>{u.email} ({u.role_name || 'User'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  Simpan Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT DIVISION */}
      {showDivisionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '450px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0', color: '#fff' }}>
              {editingDivision ? 'Edit Divisi' : 'Tambah Divisi Baru'}
            </h2>
            <form onSubmit={handleSaveDivision}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Kode Divisi *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingDivision}
                  value={divForm.code}
                  onChange={e => setDivForm({ ...divForm, code: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nama Divisi *</label>
                <input
                  type="text"
                  required
                  value={divForm.name}
                  onChange={e => setDivForm({ ...divForm, name: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Deskripsi</label>
                <textarea
                  rows={3}
                  value={divForm.description}
                  onChange={e => setDivForm({ ...divForm, description: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowDivisionModal(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  Simpan Divisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT POSITION */}
      {showPositionModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '24px', width: '450px', maxWidth: '90vw' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0', color: '#fff' }}>
              {editingPosition ? 'Edit Jabatan' : 'Tambah Jabatan Baru'}
            </h2>
            <form onSubmit={handleSavePosition}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Kode Jabatan *</label>
                <input
                  type="text"
                  required
                  disabled={!!editingPosition}
                  value={posForm.code}
                  onChange={e => setPosForm({ ...posForm, code: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Nama Jabatan *</label>
                <input
                  type="text"
                  required
                  value={posForm.name}
                  onChange={e => setPosForm({ ...posForm, name: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Divisi Induk *</label>
                <select
                  required
                  value={posForm.division_id}
                  onChange={e => setPosForm({ ...posForm, division_id: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                >
                  <option value="">-- Pilih Divisi Induk --</option>
                  {divisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Level Jabatan</label>
                <input
                  type="text"
                  value={posForm.level}
                  onChange={e => setPosForm({ ...posForm, level: e.target.value })}
                  placeholder="Contoh: MANAGER / SUPERVISOR / STAFF"
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '8px', borderRadius: '4px', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowPositionModal(false)}
                  style={{ background: '#334155', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
                >
                  Simpan Jabatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
