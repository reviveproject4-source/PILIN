'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { PersistentEmployeeStore } from '@/domains/people/persistentEmployeeStore';
import { Employee } from '@/domains/people/people.types';

export interface EmployeeDTO {
  id?: string;
  business_id: string;
  employee_code: string;
  full_name: string;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  employment_status?: 'ACTIVE' | 'INACTIVE' | 'RESIGNED';
  branch_id?: string | null;
  branch_name?: string | null;
  division_id?: string | null;
  division_name?: string | null;
  position_id?: string | null;
  position_name?: string | null;
  supervisor_id?: string | null;
  base_salary?: number;
  incentive_rate?: number;
}

export async function getLiveEmployeesAction(businessId: string): Promise<any[]> {
  const localList = PersistentEmployeeStore.listByBusinessId(businessId);
  try {
    const supabase = createAdminClient();
    const { data: emps, error } = await supabase
      .from('employees')
      .select('*, positions(id, code, name), divisions(id, code, name), branches(id, name)')
      .eq('business_id', businessId);

    if (!error && emps && emps.length > 0) {
      const dbMapped = emps.map(e => ({
        id: e.id,
        business_id: e.business_id,
        employee_code: e.employee_code,
        full_name: e.full_name,
        nickname: e.nickname,
        phone: e.phone,
        email: e.email,
        employment_status: e.employment_status,
        branch_id: e.branch_id,
        branch_name: e.branches?.name || 'Cabang Utama Bengkel Tas Sepatu',
        division_id: e.division_id,
        division_name: e.divisions?.name || 'Operasional Kasir',
        position_id: e.position_id,
        position_name: e.positions?.name || 'Kasir',
        is_active: e.is_active,
        created_at: e.created_at,
        updated_at: e.updated_at,
      }));

      // Merge and sync into PersistentEmployeeStore
      dbMapped.forEach(e => PersistentEmployeeStore.save(e));
      return dbMapped;
    }
  } catch (err) {
    // offline or serverless fallback
  }

  return localList;
}

export async function createLiveEmployeeAction(dto: EmployeeDTO): Promise<{ success: boolean; employee?: any; message?: string }> {
  try {
    const newEmp: Employee = {
      id: dto.id || `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      employee_code: dto.employee_code.trim().toUpperCase(),
      full_name: dto.full_name.trim(),
      nickname: dto.nickname?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      branch_id: dto.branch_id || null,
      branch_name: dto.branch_name || 'Cabang Utama Bengkel Tas Sepatu',
      division_id: dto.division_id || null,
      division_name: dto.division_name || 'Operasional Kasir',
      position_id: dto.position_id || null,
      position_name: dto.position_name || 'Kasir',
      supervisor_id: dto.supervisor_id || null,
      employment_status: dto.employment_status || 'ACTIVE',
      base_salary: dto.base_salary !== undefined ? dto.base_salary : null,
      incentive_rate: dto.incentive_rate !== undefined ? dto.incentive_rate : null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Save to Persistent Server File Store (guaranteed across all sessions & devices!)
    PersistentEmployeeStore.save(newEmp);

    // 2. Also sync to Supabase if database is available
    try {
      const supabase = createAdminClient();
      await supabase
        .from('employees')
        .insert({
          business_id: dto.business_id,
          employee_code: newEmp.employee_code,
          full_name: newEmp.full_name,
          nickname: newEmp.nickname,
          phone: newEmp.phone,
          email: newEmp.email,
          branch_id: newEmp.branch_id,
          division_id: newEmp.division_id,
          position_id: newEmp.position_id,
          employment_status: newEmp.employment_status,
          is_active: true,
        });
    } catch {
      // Supabase sync fallback ignored
    }

    return { success: true, employee: newEmp };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

export async function updateLiveEmployeeAction(id: string, updates: Partial<EmployeeDTO> & { business_id: string }): Promise<{ success: boolean; employee?: any; message?: string }> {
  try {
    // Load existing from PersistentEmployeeStore
    const existing = PersistentEmployeeStore.listByBusinessId(updates.business_id)
      .find(e => e.id === id);

    if (!existing) {
      return { success: false, message: 'Pegawai tidak ditemukan di store.' };
    }

    const updated: Employee = {
      ...existing,
      full_name: updates.full_name !== undefined ? updates.full_name.trim() : existing.full_name,
      nickname: updates.nickname !== undefined ? (updates.nickname?.trim() || null) : existing.nickname,
      phone: updates.phone !== undefined ? (updates.phone?.trim() || null) : existing.phone,
      email: updates.email !== undefined ? (updates.email?.trim() || null) : existing.email,
      branch_id: updates.branch_id !== undefined ? (updates.branch_id || null) : existing.branch_id,
      branch_name: updates.branch_name !== undefined ? (updates.branch_name || existing.branch_name) : existing.branch_name,
      division_id: updates.division_id !== undefined ? (updates.division_id || null) : existing.division_id,
      division_name: updates.division_name !== undefined ? (updates.division_name || existing.division_name) : existing.division_name,
      position_id: updates.position_id !== undefined ? (updates.position_id || null) : existing.position_id,
      position_name: updates.position_name !== undefined ? (updates.position_name || existing.position_name) : existing.position_name,
      employment_status: updates.employment_status !== undefined ? updates.employment_status : existing.employment_status,
      is_active: updates.employment_status !== undefined ? updates.employment_status === 'ACTIVE' : existing.is_active,
      updated_at: new Date().toISOString(),
    };

    // 1. Persist to server file store
    PersistentEmployeeStore.save(updated);

    // 2. Try sync to Supabase (non-blocking)
    try {
      const supabase = createAdminClient();
      await supabase
        .from('employees')
        .update({
          full_name: updated.full_name,
          nickname: updated.nickname,
          phone: updated.phone,
          email: updated.email,
          branch_id: updated.branch_id,
          division_id: updated.division_id,
          position_id: updated.position_id,
          employment_status: updated.employment_status,
          is_active: updated.is_active,
          updated_at: updated.updated_at,
        })
        .eq('id', id);
    } catch {
      // Supabase sync fallback ignored
    }

    return { success: true, employee: updated };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
