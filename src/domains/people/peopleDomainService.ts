import { 
  Employee, Division, Position, 
  CreateDivisionDTO, CreatePositionDTO, 
  CreateEmployeeDTO, UpdateEmployeeDTO 
} from './people.types';
import { PeopleRepository } from './peopleRepository';
import { AuditLogger } from '@/domains/control/auditLogger';

export class PeopleDomainService {

  // ==================== DIVISIONS ====================

  static async createDivision(actor_user_id: string | undefined, dto: CreateDivisionDTO): Promise<Division> {
    if (!dto.business_id) {
      throw new Error('Business ID is required for division');
    }
    if (!dto.code || !dto.code.trim()) {
      throw new Error('Division code is required');
    }
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Division name is required');
    }

    const existingCode = await PeopleRepository.getDivisionByCode(dto.business_id, dto.code.trim().toUpperCase());
    if (existingCode) {
      throw new Error(`Division code '${dto.code}' already exists in this business tenant`);
    }

    const division = await PeopleRepository.createDivision(dto);
    
    // Audit log
    AuditLogger.buildLogEntry(
      dto.business_id,
      'CREATE_DIVISION',
      'divisions',
      actor_user_id,
      undefined,
      division.id,
      { code: division.code, name: division.name }
    );

    return division;
  }

  // ==================== POSITIONS ====================

  static async createPosition(actor_user_id: string | undefined, dto: CreatePositionDTO): Promise<Position> {
    if (!dto.business_id) {
      throw new Error('Business ID is required for position');
    }
    if (!dto.division_id) {
      throw new Error('Division ID is required for position');
    }
    if (!dto.code || !dto.code.trim()) {
      throw new Error('Position code is required');
    }
    if (!dto.name || !dto.name.trim()) {
      throw new Error('Position name is required');
    }

    // Verify division belongs to same business
    const division = await PeopleRepository.getDivisionById(dto.division_id);
    if (!division || division.business_id !== dto.business_id) {
      throw new Error('Division does not belong to the same business tenant');
    }

    const existingCode = await PeopleRepository.getPositionByCode(dto.business_id, dto.code.trim().toUpperCase());
    if (existingCode) {
      throw new Error(`Position code '${dto.code}' already exists in this business tenant`);
    }

    const position = await PeopleRepository.createPosition(dto);

    AuditLogger.buildLogEntry(
      dto.business_id,
      'CREATE_POSITION',
      'positions',
      actor_user_id,
      undefined,
      position.id,
      { code: position.code, name: position.name, division_id: position.division_id }
    );

    return position;
  }

  // ==================== EMPLOYEES ====================

  static async createEmployee(actor_user_id: string | undefined, dto: CreateEmployeeDTO): Promise<Employee> {
    // 1. Core validations
    if (!dto.business_id) {
      throw new Error('Business ID is required for employee');
    }
    if (!dto.employee_code || !dto.employee_code.trim()) {
      throw new Error('Employee code is required');
    }
    if (!dto.full_name || !dto.full_name.trim()) {
      throw new Error('Full name is required');
    }

    const formattedCode = dto.employee_code.trim().toUpperCase();

    // 2. Uniqueness checks per business
    const existingCode = await PeopleRepository.getEmployeeByCode(dto.business_id, formattedCode);
    if (existingCode) {
      throw new Error(`Employee code '${formattedCode}' already exists in this business tenant`);
    }

    if (dto.auth_user_id) {
      const existingAuth = await PeopleRepository.getEmployeeByAuthUser(dto.business_id, dto.auth_user_id);
      if (existingAuth) {
        throw new Error(`Auth user ID '${dto.auth_user_id}' already linked to an employee in this business tenant`);
      }
    }

    // 3. Position & Division consistency
    let finalDivisionId = dto.division_id;
    if (dto.position_id) {
      const position = await PeopleRepository.getPositionById(dto.position_id);
      if (!position || position.business_id !== dto.business_id) {
        throw new Error('Position does not belong to the same business tenant');
      }

      if (finalDivisionId && finalDivisionId !== position.division_id) {
        throw new Error(`Division '${finalDivisionId}' is inconsistent with position division '${position.division_id}'`);
      }
      finalDivisionId = position.division_id;
    }

    // 4. Division tenant check if provided without position
    if (finalDivisionId) {
      const div = await PeopleRepository.getDivisionById(finalDivisionId);
      if (!div || div.business_id !== dto.business_id) {
        throw new Error('Division does not belong to the same business tenant');
      }
    }

    // 5. Supervisor check
    if (dto.supervisor_id) {
      const supervisor = await PeopleRepository.getEmployeeById(dto.supervisor_id);
      if (!supervisor || supervisor.business_id !== dto.business_id) {
        throw new Error('Supervisor must belong to the same business tenant');
      }
      if (supervisor.employment_status !== 'ACTIVE' || !supervisor.is_active) {
        throw new Error('Supervisor must be an ACTIVE employee');
      }
    }

    const status = dto.employment_status || 'ACTIVE';

    const payload: CreateEmployeeDTO = {
      ...dto,
      employee_code: formattedCode,
      division_id: finalDivisionId,
      employment_status: status,
    };

    const employee = await PeopleRepository.createEmployee(payload);

    AuditLogger.buildLogEntry(
      employee.business_id,
      'CREATE_EMPLOYEE',
      'employees',
      actor_user_id,
      employee.branch_id || undefined,
      employee.id,
      { employee_code: employee.employee_code, full_name: employee.full_name, status: employee.employment_status }
    );

    return employee;
  }

  static async updateEmployee(actor_user_id: string | undefined, id: string, dto: UpdateEmployeeDTO): Promise<Employee> {
    const existing = await PeopleRepository.getEmployeeById(id);
    if (!existing) {
      throw new Error(`Employee with ID '${id}' not found`);
    }

    // 1. Position & Division consistency
    let finalDivisionId = dto.division_id !== undefined ? dto.division_id : existing.division_id;
    const finalPositionId = dto.position_id !== undefined ? dto.position_id : existing.position_id;

    if (finalPositionId) {
      const position = await PeopleRepository.getPositionById(finalPositionId);
      if (!position || position.business_id !== existing.business_id) {
        throw new Error('Position does not belong to the same business tenant');
      }

      if (dto.division_id && dto.division_id !== position.division_id) {
        throw new Error(`Division '${dto.division_id}' is inconsistent with position division '${position.division_id}'`);
      }
      finalDivisionId = position.division_id;
    }

    // 2. Supervisor check
    const finalSupervisorId = dto.supervisor_id !== undefined ? dto.supervisor_id : existing.supervisor_id;
    if (finalSupervisorId) {
      if (finalSupervisorId === id) {
        throw new Error('Employee cannot be their own supervisor');
      }
      const supervisor = await PeopleRepository.getEmployeeById(finalSupervisorId);
      if (!supervisor || supervisor.business_id !== existing.business_id) {
        throw new Error('Supervisor must belong to the same business tenant');
      }
      if (supervisor.employment_status !== 'ACTIVE' || !supervisor.is_active) {
        throw new Error('Supervisor must be an ACTIVE employee');
      }
    }

    const updated = await PeopleRepository.updateEmployee(id, {
      ...dto,
      division_id: finalDivisionId || undefined,
      supervisor_id: finalSupervisorId || undefined,
    });

    if (!updated) {
      throw new Error(`Failed to update employee '${id}'`);
    }

    AuditLogger.buildLogEntry(
      updated.business_id,
      'UPDATE_EMPLOYEE',
      'employees',
      actor_user_id,
      updated.branch_id || undefined,
      updated.id,
      { employee_code: updated.employee_code, full_name: updated.full_name, status: updated.employment_status }
    );

    return updated;
  }

  static async activateEmployee(actor_user_id: string | undefined, id: string): Promise<Employee> {
    const existing = await PeopleRepository.getEmployeeById(id);
    if (!existing) {
      throw new Error(`Employee with ID '${id}' not found`);
    }

    if (existing.employment_status === 'RESIGNED') {
      throw new Error('Resigned employee cannot be directly activated without explicit rehiring process');
    }

    return this.updateEmployee(actor_user_id, id, {
      employment_status: 'ACTIVE',
      is_active: true,
    });
  }

  static async deactivateEmployee(actor_user_id: string | undefined, id: string): Promise<Employee> {
    return this.updateEmployee(actor_user_id, id, {
      employment_status: 'INACTIVE',
      is_active: false,
    });
  }

  static async resignEmployee(actor_user_id: string | undefined, id: string): Promise<Employee> {
    return this.updateEmployee(actor_user_id, id, {
      employment_status: 'RESIGNED',
      is_active: false,
    });
  }
}
