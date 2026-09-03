import { 
  Division, Position, Employee, 
  CreateDivisionDTO, UpdateDivisionDTO, 
  CreatePositionDTO, UpdatePositionDTO, 
  CreateEmployeeDTO, UpdateEmployeeDTO 
} from './people.types';
import { createClient } from '@/lib/supabase/client';

export class PeopleRepository {
  private static forceMockMode = false;
  private static mockDivisions: Division[] = [];
  private static mockPositions: Position[] = [];
  private static mockEmployees: Employee[] = [];

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

  // ==================== DIVISIONS ====================

  static async listDivisions(business_id: string): Promise<Division[]> {
    if (this.isMockMode()) {
      return this.mockDivisions.filter(d => d.business_id === business_id);
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`[Database Error] Failed to list divisions: ${error.message}`);
    }
    return (data || []) as Division[];
  }

  static async getDivisionById(id: string): Promise<Division | null> {
    if (this.isMockMode()) {
      return this.mockDivisions.find(d => d.id === id) || null;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get division '${id}': ${error.message}`);
    }
    return (data as Division) || null;
  }

  static async getDivisionByCode(business_id: string, code: string): Promise<Division | null> {
    if (this.isMockMode()) {
      return this.mockDivisions.find(d => d.business_id === business_id && d.code === code) || null;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from('divisions')
      .select('*')
      .eq('business_id', business_id)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get division code '${code}': ${error.message}`);
    }
    return (data as Division) || null;
  }

  static async createDivision(dto: CreateDivisionDTO): Promise<Division> {
    const formattedCode = dto.code.trim().toUpperCase();
    if (this.isMockMode()) {
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
      this.mockDivisions.push(newDiv);
      return newDiv;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('divisions')
      .insert({
        business_id: dto.business_id,
        code: formattedCode,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to create division: ${error.message}`);
    }
    return data as Division;
  }

  static async updateDivision(id: string, dto: UpdateDivisionDTO): Promise<Division | null> {
    if (this.isMockMode()) {
      const existing = this.mockDivisions.find(d => d.id === id);
      if (!existing) return null;
      const updated: Division = {
        ...existing,
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
        is_active: dto.is_active !== undefined ? dto.is_active : existing.is_active,
        updated_at: new Date().toISOString(),
      };
      const idx = this.mockDivisions.findIndex(d => d.id === id);
      if (idx >= 0) this.mockDivisions[idx] = updated;
      return updated;
    }

    const supabase = createClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.description !== undefined) updatePayload.description = dto.description?.trim() || null;
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;

    const { data, error } = await supabase
      .from('divisions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to update division '${id}': ${error.message}`);
    }
    return data as Division;
  }

  // ==================== POSITIONS ====================

  static async listPositions(business_id: string, division_id?: string): Promise<Position[]> {
    if (this.isMockMode()) {
      return this.mockPositions.filter(p => 
        p.business_id === business_id && (!division_id || p.division_id === division_id)
      );
    }

    const supabase = createClient();
    let query = supabase
      .from('positions')
      .select('*')
      .eq('business_id', business_id);

    if (division_id) {
      query = query.eq('division_id', division_id);
    }

    const { data, error } = await query.order('created_at', { ascending: true });

    if (error) {
      throw new Error(`[Database Error] Failed to list positions: ${error.message}`);
    }
    return (data || []) as Position[];
  }

  static async getPositionById(id: string): Promise<Position | null> {
    if (this.isMockMode()) {
      return this.mockPositions.find(p => p.id === id) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get position '${id}': ${error.message}`);
    }
    return (data as Position) || null;
  }

  static async getPositionByCode(business_id: string, code: string): Promise<Position | null> {
    if (this.isMockMode()) {
      return this.mockPositions.find(p => p.business_id === business_id && p.code === code) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('business_id', business_id)
      .eq('code', code)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get position code '${code}': ${error.message}`);
    }
    return (data as Position) || null;
  }

  static async createPosition(dto: CreatePositionDTO): Promise<Position> {
    const formattedCode = dto.code.trim().toUpperCase();

    if (this.isMockMode()) {
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
      this.mockPositions.push(newPos);
      return newPos;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('positions')
      .insert({
        business_id: dto.business_id,
        division_id: dto.division_id,
        code: formattedCode,
        name: dto.name.trim(),
        level: dto.level?.trim() || null,
        description: dto.description?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to create position: ${error.message}`);
    }
    return data as Position;
  }

  static async updatePosition(id: string, dto: UpdatePositionDTO): Promise<Position | null> {
    if (this.isMockMode()) {
      const existing = this.mockPositions.find(p => p.id === id);
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
      const idx = this.mockPositions.findIndex(p => p.id === id);
      if (idx >= 0) this.mockPositions[idx] = updated;
      return updated;
    }

    const supabase = createClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (dto.division_id) updatePayload.division_id = dto.division_id;
    if (dto.name !== undefined) updatePayload.name = dto.name.trim();
    if (dto.level !== undefined) updatePayload.level = dto.level?.trim() || null;
    if (dto.description !== undefined) updatePayload.description = dto.description?.trim() || null;
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;

    const { data, error } = await supabase
      .from('positions')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to update position '${id}': ${error.message}`);
    }
    return data as Position;
  }

  // ==================== EMPLOYEES ====================

  static async listEmployees(business_id: string, filters?: { branch_id?: string; division_id?: string; status?: string }): Promise<Employee[]> {
    if (this.isMockMode()) {
      return this.mockEmployees.filter(e => {
        if (e.business_id !== business_id) return false;
        if (filters?.branch_id && e.branch_id !== filters.branch_id) return false;
        if (filters?.division_id && e.division_id !== filters.division_id) return false;
        if (filters?.status && e.employment_status !== filters.status) return false;
        return true;
      });
    }

    const supabase = createClient();
    let query = supabase
      .from('employees')
      .select('*')
      .eq('business_id', business_id);

    if (filters?.branch_id) query = query.eq('branch_id', filters.branch_id);
    if (filters?.division_id) query = query.eq('division_id', filters.division_id);
    if (filters?.status) query = query.eq('employment_status', filters.status);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[Database Error] Failed to list employees: ${error.message}`);
    }
    return (data || []) as Employee[];
  }

  static async getEmployeeById(id: string): Promise<Employee | null> {
    if (this.isMockMode()) {
      return this.mockEmployees.find(e => e.id === id) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get employee '${id}': ${error.message}`);
    }
    return (data as Employee) || null;
  }

  static async getEmployeeByCode(business_id: string, employee_code: string): Promise<Employee | null> {
    if (this.isMockMode()) {
      return this.mockEmployees.find(e => e.business_id === business_id && e.employee_code === employee_code) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', business_id)
      .eq('employee_code', employee_code)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get employee code '${employee_code}': ${error.message}`);
    }
    return (data as Employee) || null;
  }

  static async getEmployeeByAuthUser(business_id: string, auth_user_id: string): Promise<Employee | null> {
    if (this.isMockMode()) {
      return this.mockEmployees.find(e => e.business_id === business_id && e.auth_user_id === auth_user_id) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('business_id', business_id)
      .eq('auth_user_id', auth_user_id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get employee for auth user '${auth_user_id}': ${error.message}`);
    }
    return (data as Employee) || null;
  }

  static async createEmployee(dto: CreateEmployeeDTO): Promise<Employee> {
    const formattedCode = dto.employee_code.trim().toUpperCase();

    if (this.isMockMode()) {
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
        division_id: dto.division_id || null,
        position_id: dto.position_id || null,
        supervisor_id: dto.supervisor_id || null,
        is_active: dto.employment_status ? dto.employment_status === 'ACTIVE' : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.mockEmployees.push(newEmp);
      return newEmp;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .insert({
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
        division_id: dto.division_id || null,
        position_id: dto.position_id || null,
        supervisor_id: dto.supervisor_id || null,
        is_active: dto.employment_status ? dto.employment_status === 'ACTIVE' : true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to create employee: ${error.message}`);
    }
    return data as Employee;
  }

  static async updateEmployee(id: string, dto: UpdateEmployeeDTO): Promise<Employee | null> {
    if (this.isMockMode()) {
      const existing = this.mockEmployees.find(e => e.id === id);
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
      const idx = this.mockEmployees.findIndex(e => e.id === id);
      if (idx >= 0) this.mockEmployees[idx] = updated;
      return updated;
    }

    const supabase = createClient();
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.full_name !== undefined) updatePayload.full_name = dto.full_name.trim();
    if (dto.nickname !== undefined) updatePayload.nickname = dto.nickname?.trim() || null;
    if (dto.phone !== undefined) updatePayload.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) updatePayload.email = dto.email?.trim() || null;
    if (dto.photo_url !== undefined) updatePayload.photo_url = dto.photo_url || null;
    if (dto.birth_date !== undefined) updatePayload.birth_date = dto.birth_date || null;
    if (dto.address !== undefined) updatePayload.address = dto.address?.trim() || null;
    if (dto.join_date !== undefined) updatePayload.join_date = dto.join_date || null;
    if (dto.employment_status !== undefined) updatePayload.employment_status = dto.employment_status;
    if (dto.branch_id !== undefined) updatePayload.branch_id = dto.branch_id || null;
    if (dto.division_id !== undefined) updatePayload.division_id = dto.division_id || null;
    if (dto.position_id !== undefined) updatePayload.position_id = dto.position_id || null;
    if (dto.supervisor_id !== undefined) updatePayload.supervisor_id = dto.supervisor_id || null;
    if (dto.is_active !== undefined) updatePayload.is_active = dto.is_active;

    const { data, error } = await supabase
      .from('employees')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to update employee '${id}': ${error.message}`);
    }
    return data as Employee;
  }

  static clearMockData() {
    this.mockDivisions = [];
    this.mockPositions = [];
    this.mockEmployees = [];
  }
}
