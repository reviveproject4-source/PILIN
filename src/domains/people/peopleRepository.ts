import { 
  Division, Position, Employee, 
  CreateDivisionDTO, UpdateDivisionDTO, 
  CreatePositionDTO, UpdatePositionDTO, 
  CreateEmployeeDTO, UpdateEmployeeDTO 
} from './people.types';
import { createClient } from '@/lib/supabase/client';

export class PeopleRepository {
  private static mockDivisions: Division[] = [];
  private static mockPositions: Position[] = [];
  private static mockEmployees: Employee[] = [];

  private static isSupabaseConfigured(): boolean {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    return !!url && !url.includes('placeholder.supabase.co');
  }

  // ==================== DIVISIONS ====================

  static async listDivisions(business_id: string): Promise<Division[]> {
    if (!this.isSupabaseConfigured()) {
      return this.mockDivisions.filter(d => d.business_id === business_id);
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('business_id', business_id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as Division[];
      }
    } catch {
      // Fallback
    }
    return this.mockDivisions.filter(d => d.business_id === business_id);
  }

  static async getDivisionById(id: string): Promise<Division | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockDivisions.find(d => d.id === id) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as Division;
      }
    } catch {
      // Fallback
    }
    return this.mockDivisions.find(d => d.id === id) || null;
  }

  static async getDivisionByCode(business_id: string, code: string): Promise<Division | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockDivisions.find(d => d.business_id === business_id && d.code === code) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('business_id', business_id)
        .eq('code', code)
        .single();

      if (!error && data) {
        return data as Division;
      }
    } catch {
      // Fallback
    }
    return this.mockDivisions.find(d => d.business_id === business_id && d.code === code) || null;
  }

  static async createDivision(dto: CreateDivisionDTO): Promise<Division> {
    const newDiv: Division = {
      id: `div-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!this.isSupabaseConfigured()) {
      this.mockDivisions.push(newDiv);
      return newDiv;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('divisions')
        .insert({
          business_id: newDiv.business_id,
          code: newDiv.code,
          name: newDiv.name,
          description: newDiv.description,
          is_active: newDiv.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        const created = data as Division;
        this.mockDivisions.push(created);
        return created;
      }
    } catch {
      // Fallback
    }

    this.mockDivisions.push(newDiv);
    return newDiv;
  }

  static async updateDivision(id: string, dto: UpdateDivisionDTO): Promise<Division | null> {
    const existing = await this.getDivisionById(id);
    if (!existing) return null;

    const updated: Division = {
      ...existing,
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      is_active: dto.is_active !== undefined ? dto.is_active : existing.is_active,
      updated_at: new Date().toISOString(),
    };

    if (!this.isSupabaseConfigured()) {
      const idx = this.mockDivisions.findIndex(d => d.id === id);
      if (idx >= 0) this.mockDivisions[idx] = updated;
      return updated;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('divisions')
        .update({
          name: updated.name,
          description: updated.description,
          is_active: updated.is_active,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const res = data as Division;
        const idx = this.mockDivisions.findIndex(d => d.id === id);
        if (idx >= 0) this.mockDivisions[idx] = res;
        return res;
      }
    } catch {
      // Fallback
    }

    const idx = this.mockDivisions.findIndex(d => d.id === id);
    if (idx >= 0) this.mockDivisions[idx] = updated;
    return updated;
  }

  // ==================== POSITIONS ====================

  static async listPositions(business_id: string, division_id?: string): Promise<Position[]> {
    if (!this.isSupabaseConfigured()) {
      return this.mockPositions.filter(p => 
        p.business_id === business_id && (!division_id || p.division_id === division_id)
      );
    }
    try {
      const supabase = createClient();
      let query = supabase
        .from('positions')
        .select('*')
        .eq('business_id', business_id);

      if (division_id) {
        query = query.eq('division_id', division_id);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (!error && data) {
        return data as Position[];
      }
    } catch {
      // Fallback
    }
    return this.mockPositions.filter(p => 
      p.business_id === business_id && (!division_id || p.division_id === division_id)
    );
  }

  static async getPositionById(id: string): Promise<Position | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockPositions.find(p => p.id === id) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as Position;
      }
    } catch {
      // Fallback
    }
    return this.mockPositions.find(p => p.id === id) || null;
  }

  static async getPositionByCode(business_id: string, code: string): Promise<Position | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockPositions.find(p => p.business_id === business_id && p.code === code) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .eq('business_id', business_id)
        .eq('code', code)
        .single();

      if (!error && data) {
        return data as Position;
      }
    } catch {
      // Fallback
    }
    return this.mockPositions.find(p => p.business_id === business_id && p.code === code) || null;
  }

  static async createPosition(dto: CreatePositionDTO): Promise<Position> {
    const newPos: Position = {
      id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      division_id: dto.division_id,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      level: dto.level?.trim() || null,
      description: dto.description?.trim() || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!this.isSupabaseConfigured()) {
      this.mockPositions.push(newPos);
      return newPos;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('positions')
        .insert({
          business_id: newPos.business_id,
          division_id: newPos.division_id,
          code: newPos.code,
          name: newPos.name,
          level: newPos.level,
          description: newPos.description,
          is_active: newPos.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        const created = data as Position;
        this.mockPositions.push(created);
        return created;
      }
    } catch {
      // Fallback
    }

    this.mockPositions.push(newPos);
    return newPos;
  }

  static async updatePosition(id: string, dto: UpdatePositionDTO): Promise<Position | null> {
    const existing = await this.getPositionById(id);
    if (!existing) return null;

    const updated: Position = {
      ...existing,
      division_id: dto.division_id || existing.division_id,
      name: dto.name !== undefined ? dto.name.trim() : existing.name,
      level: dto.level !== undefined ? dto.level?.trim() || null : existing.level,
      description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
      is_active: dto.is_active !== undefined ? dto.is_active : existing.is_active,
      updated_at: new Date().toISOString(),
    };

    if (!this.isSupabaseConfigured()) {
      const idx = this.mockPositions.findIndex(p => p.id === id);
      if (idx >= 0) this.mockPositions[idx] = updated;
      return updated;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('positions')
        .update({
          division_id: updated.division_id,
          name: updated.name,
          level: updated.level,
          description: updated.description,
          is_active: updated.is_active,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const res = data as Position;
        const idx = this.mockPositions.findIndex(p => p.id === id);
        if (idx >= 0) this.mockPositions[idx] = res;
        return res;
      }
    } catch {
      // Fallback
    }

    const idx = this.mockPositions.findIndex(p => p.id === id);
    if (idx >= 0) this.mockPositions[idx] = updated;
    return updated;
  }

  // ==================== EMPLOYEES ====================

  static async listEmployees(business_id: string, filters?: { branch_id?: string; division_id?: string; status?: string }): Promise<Employee[]> {
    if (!this.isSupabaseConfigured()) {
      return this.mockEmployees.filter(e => {
        if (e.business_id !== business_id) return false;
        if (filters?.branch_id && e.branch_id !== filters.branch_id) return false;
        if (filters?.division_id && e.division_id !== filters.division_id) return false;
        if (filters?.status && e.employment_status !== filters.status) return false;
        return true;
      });
    }

    try {
      const supabase = createClient();
      let query = supabase
        .from('employees')
        .select('*')
        .eq('business_id', business_id);

      if (filters?.branch_id) query = query.eq('branch_id', filters.branch_id);
      if (filters?.division_id) query = query.eq('division_id', filters.division_id);
      if (filters?.status) query = query.eq('employment_status', filters.status);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (!error && data) {
        return data as Employee[];
      }
    } catch {
      // Fallback
    }

    return this.mockEmployees.filter(e => {
      if (e.business_id !== business_id) return false;
      if (filters?.branch_id && e.branch_id !== filters.branch_id) return false;
      if (filters?.division_id && e.division_id !== filters.division_id) return false;
      if (filters?.status && e.employment_status !== filters.status) return false;
      return true;
    });
  }

  static async getEmployeeById(id: string): Promise<Employee | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockEmployees.find(e => e.id === id) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as Employee;
      }
    } catch {
      // Fallback
    }
    return this.mockEmployees.find(e => e.id === id) || null;
  }

  static async getEmployeeByCode(business_id: string, employee_code: string): Promise<Employee | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockEmployees.find(e => e.business_id === business_id && e.employee_code === employee_code) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', business_id)
        .eq('employee_code', employee_code)
        .single();

      if (!error && data) {
        return data as Employee;
      }
    } catch {
      // Fallback
    }
    return this.mockEmployees.find(e => e.business_id === business_id && e.employee_code === employee_code) || null;
  }

  static async getEmployeeByAuthUser(business_id: string, auth_user_id: string): Promise<Employee | null> {
    if (!this.isSupabaseConfigured()) {
      return this.mockEmployees.find(e => e.business_id === business_id && e.auth_user_id === auth_user_id) || null;
    }
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', business_id)
        .eq('auth_user_id', auth_user_id)
        .single();

      if (!error && data) {
        return data as Employee;
      }
    } catch {
      // Fallback
    }
    return this.mockEmployees.find(e => e.business_id === business_id && e.auth_user_id === auth_user_id) || null;
  }

  static async createEmployee(dto: CreateEmployeeDTO): Promise<Employee> {
    const newEmp: Employee = {
      id: `emp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      business_id: dto.business_id,
      auth_user_id: dto.auth_user_id || null,
      employee_code: dto.employee_code.trim().toUpperCase(),
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
      division_id: dto.division_id || null,
      position_id: dto.position_id || null,
      supervisor_id: dto.supervisor_id || null,
      is_active: dto.employment_status ? dto.employment_status === 'ACTIVE' : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!this.isSupabaseConfigured()) {
      this.mockEmployees.push(newEmp);
      return newEmp;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .insert({
          business_id: newEmp.business_id,
          auth_user_id: newEmp.auth_user_id,
          employee_code: newEmp.employee_code,
          full_name: newEmp.full_name,
          nickname: newEmp.nickname,
          phone: newEmp.phone,
          email: newEmp.email,
          photo_url: newEmp.photo_url,
          birth_date: newEmp.birth_date,
          address: newEmp.address,
          join_date: newEmp.join_date,
          employment_status: newEmp.employment_status,
          branch_id: newEmp.branch_id,
          division_id: newEmp.division_id,
          position_id: newEmp.position_id,
          supervisor_id: newEmp.supervisor_id,
          is_active: newEmp.is_active,
        })
        .select()
        .single();

      if (!error && data) {
        const created = data as Employee;
        this.mockEmployees.push(created);
        return created;
      }
    } catch {
      // Fallback
    }

    this.mockEmployees.push(newEmp);
    return newEmp;
  }

  static async updateEmployee(id: string, dto: UpdateEmployeeDTO): Promise<Employee | null> {
    const existing = await this.getEmployeeById(id);
    if (!existing) return null;

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
      branch_id: dto.branch_id !== undefined ? dto.branch_id || null : existing.branch_id,
      division_id: dto.division_id !== undefined ? dto.division_id || null : existing.division_id,
      position_id: dto.position_id !== undefined ? dto.position_id || null : existing.position_id,
      supervisor_id: dto.supervisor_id !== undefined ? dto.supervisor_id || null : existing.supervisor_id,
      is_active: dto.is_active !== undefined ? dto.is_active : (dto.employment_status ? dto.employment_status === 'ACTIVE' : existing.is_active),
      updated_at: new Date().toISOString(),
    };

    if (!this.isSupabaseConfigured()) {
      const idx = this.mockEmployees.findIndex(e => e.id === id);
      if (idx >= 0) this.mockEmployees[idx] = updated;
      return updated;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .update({
          full_name: updated.full_name,
          nickname: updated.nickname,
          phone: updated.phone,
          email: updated.email,
          photo_url: updated.photo_url,
          birth_date: updated.birth_date,
          address: updated.address,
          join_date: updated.join_date,
          employment_status: updated.employment_status,
          branch_id: updated.branch_id,
          division_id: updated.division_id,
          position_id: updated.position_id,
          supervisor_id: updated.supervisor_id,
          is_active: updated.is_active,
          updated_at: updated.updated_at,
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const res = data as Employee;
        const idx = this.mockEmployees.findIndex(e => e.id === id);
        if (idx >= 0) this.mockEmployees[idx] = res;
        return res;
      }
    } catch {
      // Fallback
    }

    const idx = this.mockEmployees.findIndex(e => e.id === id);
    if (idx >= 0) this.mockEmployees[idx] = updated;
    return updated;
  }

  static clearMockData() {
    this.mockDivisions = [];
    this.mockPositions = [];
    this.mockEmployees = [];
  }
}
