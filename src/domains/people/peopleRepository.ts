import { 
  Division, Position, Employee, 
  CreateDivisionDTO, UpdateDivisionDTO, 
  CreatePositionDTO, UpdatePositionDTO, 
  CreateEmployeeDTO, UpdateEmployeeDTO 
} from './people.types';
import { createClient } from '@/lib/supabase/client';

export interface BranchItem {
  id: string;
  business_id?: string;
  name: string;
  code?: string;
  address?: string;
}

export class PeopleRepository {
  private static forceMockMode = false;
  private static mockDivisions: Division[] = [];
  private static mockPositions: Position[] = [];
  private static mockEmployees: Employee[] = [];
  private static mockBranches: BranchItem[] = [];

  static setMockMode(enabled: boolean) {
    this.forceMockMode = enabled;
  }

  private static isMockMode(): boolean {
    if (this.forceMockMode) return true;
    if (process.env.USE_MOCK_REPOSITORY === 'true') return true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('placeholder.supabase.co')) {
      return true;
    }
    return false;
  }

  // LocalStorage Helpers for browser persistence
  private static getStoredData<T>(key: string, defaultVal: T): T {
    if (typeof window === 'undefined') return defaultVal;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultVal;
    } catch {
      return defaultVal;
    }
  }

  private static setStoredData<T>(key: string, val: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch {}
  }

  // ==================== BRANCHES ====================

  static async listBranches(business_id: string): Promise<BranchItem[]> {
    const stored = this.getStoredData<BranchItem[]>(`pilin_branches_${business_id}`, []);
    if (stored.length > 0) return stored;

    if (this.mockBranches.length > 0) {
      return this.mockBranches.filter(b => !b.business_id || b.business_id === business_id);
    }

    if (this.isMockMode()) {
      return this.listBranchesMock(business_id);
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('branches')
        .select('id, business_id, name, code, address')
        .eq('business_id', business_id)
        .order('name', { ascending: true });

      if (error || !data || data.length === 0) {
        return this.listBranchesMock(business_id);
      }
      return data as BranchItem[];
    } catch {
      return this.listBranchesMock(business_id);
    }
  }

  private static listBranchesMock(business_id: string): BranchItem[] {
    const stored = this.getStoredData<BranchItem[]>(`pilin_branches_${business_id}`, []);
    if (stored.length > 0) {
      this.mockBranches = stored;
      return stored;
    }
    const initial: BranchItem[] = [
      { id: 'branch-001', business_id, name: 'Cabang Utama (Alpha)', code: 'BR-001', address: 'Jl. Sudirman No. 12' },
      { id: 'branch-002', business_id, name: 'Cabang Sub-Urban (Beta)', code: 'BR-002', address: 'Jl. Ahmad Yani No. 45' },
      { id: 'branch-003', business_id, name: 'Cabang Ritel (Gamma)', code: 'BR-003', address: 'Jl. Gatot Subroto No. 88' },
    ];
    this.mockBranches = initial;
    this.setStoredData(`pilin_branches_${business_id}`, initial);
    return initial;
  }

  static async createBranch(business_id: string, dto: { name: string; code?: string; address?: string }): Promise<BranchItem> {
    const newBranch: BranchItem = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      business_id,
      name: dto.name.trim(),
      code: (dto.code || `BR-${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
      address: dto.address?.trim() || '',
    };

    const current = await this.listBranches(business_id);
    const updated = [...current, newBranch];
    this.mockBranches = updated;
    this.setStoredData(`pilin_branches_${business_id}`, updated);

    if (!this.isMockMode()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('branches')
          .insert({
            business_id,
            name: newBranch.name,
            code: newBranch.code,
            address: newBranch.address,
          })
          .select('id, business_id, name, code, address')
          .single();

        if (!error && data) {
          return data as BranchItem;
        }
      } catch {}
    }

    return newBranch;
  }

  static async updateBranch(id: string, business_id: string, dto: { name?: string; code?: string; address?: string }): Promise<BranchItem | null> {
    const current = await this.listBranches(business_id);
    const idx = current.findIndex(b => b.id === id);
    if (idx < 0) return null;

    const updatedBranch: BranchItem = {
      ...current[idx],
      name: dto.name !== undefined ? dto.name.trim() : current[idx].name,
      code: dto.code !== undefined ? dto.code.trim().toUpperCase() : current[idx].code,
      address: dto.address !== undefined ? dto.address.trim() : current[idx].address,
    };
    current[idx] = updatedBranch;
    this.mockBranches = current;
    this.setStoredData(`pilin_branches_${business_id}`, current);

    if (!this.isMockMode()) {
      try {
        const supabase = createClient();
        await supabase
          .from('branches')
          .update({
            name: updatedBranch.name,
            code: updatedBranch.code,
            address: updatedBranch.address,
          })
          .eq('id', id);
      } catch {}
    }
    return updatedBranch;
  }

  // ==================== DIVISIONS ====================

  static async listDivisions(business_id: string): Promise<Division[]> {
    const stored = this.getStoredData<Division[]>(`pilin_divisions_${business_id}`, []);
    if (stored.length > 0) {
      this.mockDivisions = stored;
      return stored;
    }
    if (this.mockDivisions.length > 0) return this.mockDivisions;

    return this.listDivisionsMock(business_id);
  }

  private static listDivisionsMock(business_id: string): Division[] {
    const initial: Division[] = [
      { id: 'div-001', business_id, code: 'OPS', name: 'Operasional & Servis', description: 'Divisi Operasional Lapangan & Servis', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'div-002', business_id, code: 'SALES', name: 'Sales & Marketing', description: 'Divisi Penjualan & Kemitraan', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'div-003', business_id, code: 'FIN', name: 'Keuangan & Akuntansi', description: 'Divisi Keuangan & Kasir', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    this.mockDivisions = initial;
    this.setStoredData(`pilin_divisions_${business_id}`, initial);
    return initial;
  }

  static async getDivisionById(id: string): Promise<Division | null> {
    const list = await this.listDivisions('tenant-001');
    return list.find(d => d.id === id) || null;
  }

  static async getDivisionByCode(business_id: string, code: string): Promise<Division | null> {
    const list = await this.listDivisions(business_id);
    return list.find(d => d.code === code.trim().toUpperCase()) || null;
  }

  static async createDivision(dto: CreateDivisionDTO): Promise<Division> {
    const formattedCode = dto.code.trim().toUpperCase();
    const newDiv: Division = {
      id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      code: formattedCode,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = await this.listDivisions(dto.business_id);
    const updated = [...current, newDiv];
    this.mockDivisions = updated;
    this.setStoredData(`pilin_divisions_${dto.business_id}`, updated);
    return newDiv;
  }

  static async updateDivision(id: string, dto: UpdateDivisionDTO): Promise<Division | null> {
    const current = await this.listDivisions('tenant-001');
    const idx = current.findIndex(d => d.id === id);
    if (idx < 0) return null;

    const updated: Division = {
      ...current[idx],
      name: dto.name !== undefined ? dto.name.trim() : current[idx].name,
      description: dto.description !== undefined ? dto.description?.trim() || null : current[idx].description,
      is_active: dto.is_active !== undefined ? dto.is_active : current[idx].is_active,
      updated_at: new Date().toISOString(),
    };
    current[idx] = updated;
    this.mockDivisions = current;
    this.setStoredData(`pilin_divisions_${current[idx].business_id}`, current);
    return updated;
  }

  // ==================== POSITIONS ====================

  static async listPositions(business_id: string, division_id?: string): Promise<Position[]> {
    const stored = this.getStoredData<Position[]>(`pilin_positions_${business_id}`, []);
    const list = stored.length > 0 ? stored : (this.mockPositions.length > 0 ? this.mockPositions : this.listPositionsMock(business_id));
    return division_id ? list.filter(p => p.division_id === division_id) : list;
  }

  private static listPositionsMock(business_id: string): Position[] {
    const initial: Position[] = [
      { id: 'pos-001', business_id, division_id: 'div-001', code: 'KC', name: 'Kepala Cabang', level: 'Managerial', description: 'Penanggung Jawab Cabang', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'pos-002', business_id, division_id: 'div-001', code: 'PROD', name: 'Tim Produksi / Teknisi', level: 'Staff', description: 'Staf Pelaksana & Teknisi', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'pos-003', business_id, division_id: 'div-003', code: 'KASIR', name: 'Staf Kasir & Keuangan', level: 'Staff', description: 'Staf Transaksi POS', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    this.mockPositions = initial;
    this.setStoredData(`pilin_positions_${business_id}`, initial);
    return initial;
  }

  static async getPositionById(id: string): Promise<Position | null> {
    const list = await this.listPositions('tenant-001');
    return list.find(p => p.id === id) || null;
  }

  static async getPositionByCode(business_id: string, code: string): Promise<Position | null> {
    const list = await this.listPositions(business_id);
    return list.find(p => p.code === code.trim().toUpperCase()) || null;
  }

  static async createPosition(dto: CreatePositionDTO): Promise<Position> {
    const formattedCode = dto.code.trim().toUpperCase();
    const newPos: Position = {
      id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      division_id: dto.division_id,
      code: formattedCode,
      name: dto.name.trim(),
      level: dto.level?.trim() || null,
      description: dto.description?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = await this.listPositions(dto.business_id);
    const updated = [...current, newPos];
    this.mockPositions = updated;
    this.setStoredData(`pilin_positions_${dto.business_id}`, updated);
    return newPos;
  }

  static async updatePosition(id: string, dto: UpdatePositionDTO): Promise<Position | null> {
    const current = await this.listPositions('tenant-001');
    const idx = current.findIndex(p => p.id === id);
    if (idx < 0) return null;

    const updated: Position = {
      ...current[idx],
      division_id: dto.division_id || current[idx].division_id,
      name: dto.name !== undefined ? dto.name.trim() : current[idx].name,
      level: dto.level !== undefined ? dto.level?.trim() || null : current[idx].level,
      description: dto.description !== undefined ? dto.description?.trim() || null : current[idx].description,
      is_active: dto.is_active !== undefined ? dto.is_active : current[idx].is_active,
      updated_at: new Date().toISOString(),
    };
    current[idx] = updated;
    this.mockPositions = current;
    this.setStoredData(`pilin_positions_${current[idx].business_id}`, current);
    return updated;
  }

  // ==================== EMPLOYEES ====================

  static async listEmployees(business_id: string, filters?: { branch_id?: string; division_id?: string; status?: string }): Promise<Employee[]> {
    const stored = this.getStoredData<Employee[]>(`pilin_employees_${business_id}`, []);
    const list = stored.length > 0 ? stored : (this.mockEmployees.length > 0 ? this.mockEmployees : this.listEmployeesMock(business_id));

    return list.filter(e => {
      if (filters?.branch_id && filters.branch_id !== 'ALL' && e.branch_id !== filters.branch_id) return false;
      if (filters?.division_id && filters.division_id !== 'ALL' && e.division_id !== filters.division_id) return false;
      if (filters?.status && filters.status !== 'ALL' && e.employment_status !== filters.status) return false;
      return true;
    });
  }

  private static listEmployeesMock(business_id: string): Employee[] {
    const initial: Employee[] = [
      {
        id: 'emp-001',
        business_id,
        auth_user_id: 'user-kc-01',
        employee_code: 'EMP-001',
        full_name: 'Hendra Wijaya',
        nickname: 'Hendra',
        phone: '081234567890',
        email: 'hendra.kc@pilin.co.id',
        employment_status: 'ACTIVE',
        branch_id: 'branch-001',
        branch_name: 'Cabang Utama (Alpha)',
        division_id: 'div-001',
        division_name: 'Operasional & Servis',
        position_id: 'pos-001',
        position_name: 'Kepala Cabang',
        supervisor_id: null,
        supervisor_name: '-',
        base_salary: 6500000,
        incentive_rate: 15000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'emp-002',
        business_id,
        auth_user_id: 'user-staff-01',
        employee_code: 'EMP-002',
        full_name: 'Siti Rahma',
        nickname: 'Siti',
        phone: '081987654321',
        email: 'siti.kasir@pilin.co.id',
        employment_status: 'ACTIVE',
        branch_id: 'branch-001',
        branch_name: 'Cabang Utama (Alpha)',
        division_id: 'div-003',
        division_name: 'Keuangan & Akuntansi',
        position_id: 'pos-003',
        position_name: 'Staf Kasir & Keuangan',
        supervisor_id: 'emp-001',
        supervisor_name: 'Hendra Wijaya',
        base_salary: 4200000,
        incentive_rate: 10000,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    this.mockEmployees = initial;
    this.setStoredData(`pilin_employees_${business_id}`, initial);
    return initial;
  }

  static async getEmployeeById(id: string): Promise<Employee | null> {
    const list = await this.listEmployees('tenant-001');
    return list.find(e => e.id === id) || null;
  }

  static async getEmployeeByCode(business_id: string, employee_code: string): Promise<Employee | null> {
    const list = await this.listEmployees(business_id);
    return list.find(e => e.employee_code === employee_code.trim().toUpperCase()) || null;
  }

  static async getEmployeeByAuthUser(business_id: string, auth_user_id: string): Promise<Employee | null> {
    const list = await this.listEmployees(business_id);
    return list.find(e => e.auth_user_id === auth_user_id) || null;
  }

  static async createEmployee(dto: CreateEmployeeDTO): Promise<Employee> {
    const formattedCode = dto.employee_code.trim().toUpperCase();

    const branches = await this.listBranches(dto.business_id);
    const divisions = await this.listDivisions(dto.business_id);
    const positions = await this.listPositions(dto.business_id);
    const employees = await this.listEmployees(dto.business_id);

    const branchObj = branches.find(b => b.id === dto.branch_id);
    const divObj = divisions.find(d => d.id === dto.division_id);
    const posObj = positions.find(p => p.id === dto.position_id);
    const superObj = employees.find(e => e.id === dto.supervisor_id);

    const newEmp: Employee = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      auth_user_id: dto.auth_user_id || null,
      employee_code: formattedCode,
      full_name: dto.full_name.trim(),
      nickname: dto.nickname?.trim() || null,
      phone: dto.phone?.trim() || null,
      email: dto.email?.trim() || null,
      photo_url: dto.photo_url || null,
      birth_date: dto.birth_date || null,
      address: dto.address?.trim() || null,
      join_date: dto.join_date || new Date().toISOString().split('T')[0],
      employment_status: dto.employment_status || 'ACTIVE',
      branch_id: dto.branch_id || null,
      branch_name: branchObj ? branchObj.name : (dto.branch_id || '-'),
      division_id: dto.division_id || null,
      division_name: divObj ? divObj.name : (dto.division_id || '-'),
      position_id: dto.position_id || null,
      position_name: posObj ? posObj.name : (dto.position_id || '-'),
      supervisor_id: dto.supervisor_id || null,
      supervisor_name: superObj ? superObj.full_name : '-',
      base_salary: dto.base_salary !== undefined ? dto.base_salary : null,
      incentive_rate: dto.incentive_rate !== undefined ? dto.incentive_rate : null,
      is_active: dto.employment_status ? dto.employment_status === 'ACTIVE' : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = await this.listEmployees(dto.business_id);
    const updated = [newEmp, ...current];
    this.mockEmployees = updated;
    this.setStoredData(`pilin_employees_${dto.business_id}`, updated);
    return newEmp;
  }

  static async updateEmployee(id: string, dto: UpdateEmployeeDTO): Promise<Employee | null> {
    const current = await this.listEmployees('tenant-001');
    const idx = current.findIndex(e => e.id === id);
    if (idx < 0) return null;

    const existing = current[idx];

    const branches = await this.listBranches(existing.business_id);
    const divisions = await this.listDivisions(existing.business_id);
    const positions = await this.listPositions(existing.business_id);
    const employees = await this.listEmployees(existing.business_id);

    const targetBranchId = dto.branch_id !== undefined ? (dto.branch_id || null) : existing.branch_id;
    const targetDivId = dto.division_id !== undefined ? (dto.division_id || null) : existing.division_id;
    const targetPosId = dto.position_id !== undefined ? (dto.position_id || null) : existing.position_id;
    const targetSuperId = dto.supervisor_id !== undefined ? (dto.supervisor_id || null) : existing.supervisor_id;

    const branchObj = branches.find(b => b.id === targetBranchId);
    const divObj = divisions.find(d => d.id === targetDivId);
    const posObj = positions.find(p => p.id === targetPosId);
    const superObj = employees.find(e => e.id === targetSuperId);

    const updated: Employee = {
      ...existing,
      full_name: dto.full_name !== undefined ? dto.full_name.trim() : existing.full_name,
      nickname: dto.nickname !== undefined ? dto.nickname?.trim() || null : existing.nickname,
      phone: dto.phone !== undefined ? dto.phone?.trim() || null : existing.phone,
      email: dto.email !== undefined ? dto.email?.trim() || null : existing.email,
      photo_url: dto.photo_url !== undefined ? dto.photo_url || null : existing.photo_url,
      birth_date: dto.birth_date !== undefined ? dto.birth_date || null : existing.birth_date,
      address: dto.address !== undefined ? dto.address?.trim() || null : existing.address,
      join_date: dto.join_date !== undefined ? dto.join_date || null : existing.join_date,
      employment_status: dto.employment_status !== undefined ? dto.employment_status : existing.employment_status,
      branch_id: targetBranchId,
      branch_name: branchObj ? branchObj.name : (targetBranchId || '-'),
      division_id: targetDivId,
      division_name: divObj ? divObj.name : (targetDivId || '-'),
      position_id: targetPosId,
      position_name: posObj ? posObj.name : (targetPosId || '-'),
      supervisor_id: targetSuperId,
      supervisor_name: superObj ? superObj.full_name : '-',
      base_salary: dto.base_salary !== undefined ? dto.base_salary : existing.base_salary,
      incentive_rate: dto.incentive_rate !== undefined ? dto.incentive_rate : existing.incentive_rate,
      is_active: dto.is_active !== undefined ? dto.is_active : (dto.employment_status ? dto.employment_status === 'ACTIVE' : existing.is_active),
      updated_at: new Date().toISOString(),
    };

    current[idx] = updated;
    this.mockEmployees = current;
    this.setStoredData(`pilin_employees_${existing.business_id}`, current);
    return updated;
  }

  // ==================== HELPER LOOKUPS ====================

  static async listAuthUsers(business_id: string): Promise<{ user_id: string; email: string; role_name?: string }[]> {
    return [
      { user_id: 'user-owner-01', email: 'owner@pilin.co.id', role_name: 'Owner' },
      { user_id: 'user-kc-01', email: 'kc.alpha@pilin.co.id', role_name: 'Kepala Cabang' },
      { user_id: 'user-staff-01', email: 'budi.kasir@pilin.co.id', role_name: 'Pegawai' },
      { user_id: 'user-staff-02', email: 'siti.laundry@pilin.co.id', role_name: 'Pegawai' },
    ];
  }

  static clearMockData() {
    this.mockDivisions = [];
    this.mockPositions = [];
    this.mockEmployees = [];
    this.mockBranches = [];
  }
}
