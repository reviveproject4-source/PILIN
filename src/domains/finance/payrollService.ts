import { GamificationDomainService } from '../intelligence/gamificationDomainService';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EARLY_LEAVE' | 'LEAVE_APPROVED';
  check_in_time?: string;
  check_out_time?: string;
  created_at: string;
}

export interface PayrollInputRecord {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  period: string;
  performance_summary: {
    completed_transactions_count: number;
    revenue_amount: number;
    points_earned: number;
    rank_tier: string;
  };
  attendance_summary: {
    present_days: number;
    absent_days: number;
    late_days: number;
    early_leave_days: number;
    leave_approved_days: number;
  };
  source_event_ids: string[];
  status: 'STAGED_FOR_PAYROLL' | 'APPROVED' | 'CLOSED';
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export class PayrollDomainService {
  private static mockAttendanceLogs: AttendanceRecord[] = [
    {
      id: 'att-00000000-0000-0000-0000-000000000001',
      employee_id: 'emp-001',
      employee_name: 'Dewi Lestari',
      date: '2026-08-14',
      status: 'PRESENT',
      check_in_time: '08:00:00',
      check_out_time: '17:00:00',
      created_at: new Date('2026-08-14T08:00:00Z').toISOString(),
    },
    {
      id: 'att-00000000-0000-0000-0000-000000000002',
      employee_id: 'emp-002',
      employee_name: 'Budi Santoso',
      date: '2026-08-14',
      status: 'PRESENT',
      check_in_time: '08:15:00',
      check_out_time: '17:00:00',
      created_at: new Date('2026-08-14T08:15:00Z').toISOString(),
    },
    {
      id: 'att-00000000-0000-0000-0000-000000000003',
      employee_id: 'emp-002',
      employee_name: 'Budi Santoso',
      date: '2026-08-13',
      status: 'LATE',
      check_in_time: '08:35:00',
      check_out_time: '17:00:00',
      created_at: new Date('2026-08-13T08:35:00Z').toISOString(),
    },
  ];

  private static mockPayrollInputs: PayrollInputRecord[] = [];

  static getAttendanceLogs(): AttendanceRecord[] {
    return [...this.mockAttendanceLogs];
  }

  static getPayrollInputs(): PayrollInputRecord[] {
    return [...this.mockPayrollInputs];
  }

  /**
   * GD-21 / OD-01: Automated Data Pipeline into Payroll.
    * Ingests authoritative Performance and Attendance events automatically.
    * DEVELOPER DOES NOT INVENT PAYROLL FORMULAS OR SALARY CONVERSIONS.
    */
  static aggregatePayrollInput(
    employeeId: string,
    employeeName: string,
    period: string,
    actorRole: string,
    actorId?: string
  ): PayrollInputRecord {
    // GD-20 RBAC Authorization Check
    const roleLower = actorRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized payroll input aggregation: Manager or Owner required (GD-20)');
    }

    // Read authoritative performance records from system operational events (GD-15)
    const perfRecords = GamificationDomainService.getRecords().filter(r => 
      r.staff_name.toLowerCase() === employeeName.toLowerCase()
    );

    // Read authoritative attendance records from system operational events (GD-15)
    const attRecords = this.mockAttendanceLogs.filter(a => 
      a.employee_id === employeeId || a.employee_name.toLowerCase() === employeeName.toLowerCase()
    );

    // Aggregate performance metrics cleanly without developer-defined formulas
    const perfSummary = {
      completed_transactions_count: perfRecords.reduce((sum, r) => sum + r.completed_transactions_count, 0),
      revenue_amount: perfRecords.reduce((sum, r) => sum + r.revenue_amount, 0),
      points_earned: perfRecords.reduce((sum, r) => sum + r.points_earned, 0),
      rank_tier: perfRecords[0]?.rank_tier || 'BRONZE',
    };

    // Aggregate attendance events
    const attSummary = {
      present_days: attRecords.filter(a => a.status === 'PRESENT').length,
      absent_days: attRecords.filter(a => a.status === 'ABSENT').length,
      late_days: attRecords.filter(a => a.status === 'LATE').length,
      early_leave_days: attRecords.filter(a => a.status === 'EARLY_LEAVE').length,
      leave_approved_days: attRecords.filter(a => a.status === 'LEAVE_APPROVED').length,
    };

    // Traceable list of source event IDs
    const sourceEventIds = [
      ...perfRecords.map(p => p.id),
      ...attRecords.map(a => a.id),
    ];

    const inputRecord: PayrollInputRecord = {
      id: `pay-in-${Date.now()}`,
      business_id: '00000000-0000-0000-0000-000000000001',
      employee_id: employeeId,
      employee_name: employeeName,
      period: period,
      performance_summary: perfSummary,
      attendance_summary: attSummary,
      source_event_ids: sourceEventIds,
      status: 'STAGED_FOR_PAYROLL',
      created_by: actorId || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mockPayrollInputs.unshift(inputRecord);
    return inputRecord;
  }

  /**
   * GD-19 Separation of Duties (Creator != Approver) for Payroll Approval
   */
  static approvePayrollInput(payrollInputId: string, approverRole: string, approverId: string): PayrollInputRecord {
    const roleLower = approverRole.toLowerCase();
    if (roleLower !== 'manager' && roleLower !== 'owner' && roleLower !== 'kepala_cabang') {
      throw new Error('Unauthorized payroll approval: Manager or Owner required (GD-20)');
    }

    const record = this.mockPayrollInputs.find(p => p.id === payrollInputId);
    if (!record) {
      throw new Error('Payroll input record not found');
    }

    // GD-19 Universal SoD: Creator cannot approve own transaction
    if (record.created_by && record.created_by === approverId) {
      throw new Error('Creator cannot approve own payroll input record (GD-19 Strict SoD)');
    }

    record.status = 'APPROVED';
    record.approved_by = approverId;
    record.updated_at = new Date().toISOString();

    return record;
  }
}
