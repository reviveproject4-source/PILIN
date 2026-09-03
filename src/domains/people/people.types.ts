export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'RESIGNED';

export interface Division {
  id: string;
  business_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  business_id: string;
  division_id: string;
  code: string;
  name: string;
  level?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  division?: Division;
}

export interface Employee {
  id: string;
  business_id: string;
  auth_user_id?: string | null;
  employee_code: string;
  full_name: string;
  nickname?: string | null;
  phone?: string | null;
  email?: string | null;
  photo_url?: string | null;
  birth_date?: string | null;
  address?: string | null;
  join_date?: string | null;
  employment_status: EmploymentStatus;
  branch_id?: string | null;
  division_id?: string | null;
  position_id?: string | null;
  supervisor_id?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Hydrated references
  branch_name?: string;
  division_name?: string;
  position_name?: string;
  supervisor_name?: string;
}

export interface CreateDivisionDTO {
  business_id: string;
  code: string;
  name: string;
  description?: string;
}

export interface UpdateDivisionDTO {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreatePositionDTO {
  business_id: string;
  division_id: string;
  code: string;
  name: string;
  level?: string;
  description?: string;
}

export interface UpdatePositionDTO {
  division_id?: string;
  name?: string;
  level?: string;
  description?: string;
  is_active?: boolean;
}

export interface CreateEmployeeDTO {
  business_id: string;
  employee_code: string;
  full_name: string;
  auth_user_id?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  birth_date?: string;
  address?: string;
  join_date?: string;
  employment_status?: EmploymentStatus;
  branch_id?: string;
  division_id?: string;
  position_id?: string;
  supervisor_id?: string;
}

export interface UpdateEmployeeDTO {
  full_name?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  photo_url?: string;
  birth_date?: string;
  address?: string;
  join_date?: string;
  employment_status?: EmploymentStatus;
  branch_id?: string;
  division_id?: string;
  position_id?: string;
  supervisor_id?: string;
  is_active?: boolean;
}
