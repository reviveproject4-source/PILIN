'use server';

import { createAdminClient } from '@/lib/supabase/admin';

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
  base_salary?: number;
  incentive_rate?: number;
}

export async function getLiveEmployeesAction(businessId: string): Promise<any[]> {
  try {
    const supabase = createAdminClient();
    const { data: emps, error } = await supabase
      .from('employees')
      .select('*, positions(id, code, name), divisions(id, code, name), branches(id, name)')
      .eq('business_id', businessId);

    if (!error && emps && emps.length > 0) {
      return emps.map(e => ({
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
    }
  } catch (err) {
    console.error('getLiveEmployeesAction error:', err);
  }
  return [];
}

export async function createLiveEmployeeAction(dto: EmployeeDTO): Promise<{ success: boolean; employee?: any; message?: string }> {
  try {
    const supabase = createAdminClient();
    const { data: newEmp, error } = await supabase
      .from('employees')
      .insert({
        business_id: dto.business_id,
        employee_code: dto.employee_code.trim().toUpperCase(),
        full_name: dto.full_name.trim(),
        nickname: dto.nickname?.trim() || null,
        phone: dto.phone?.trim() || null,
        email: dto.email?.trim() || null,
        branch_id: dto.branch_id || null,
        division_id: dto.division_id || null,
        position_id: dto.position_id || null,
        employment_status: dto.employment_status || 'ACTIVE',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, employee: newEmp };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
