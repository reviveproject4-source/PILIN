import { createClient } from '@/lib/supabase/client';
import { 
  AttendanceRecord, AttendanceRequest, OvertimeRequest, 
  AttendanceStatus, LeaveRequestStatus, OvertimeRequestStatus,
  CheckoutAttendanceDTO, ListOvertimeQueryDTO, OvertimeListItem, OvertimeListResult
} from './attendance.types';
import { PeopleRepository } from './peopleRepository';
import { AttendanceError } from './attendanceErrors';

export class AttendanceRepository {
  private static forceMockMode = false;
  private static mockAttendanceRecords: AttendanceRecord[] = [];
  private static mockAttendanceRequests: AttendanceRequest[] = [];
  private static mockOvertimeRequests: OvertimeRequest[] = [];

  static setMockMode(enabled: boolean) {
    this.forceMockMode = enabled;
  }

  static resetMockData() {
    this.mockAttendanceRecords = [];
    this.mockAttendanceRequests = [];
    this.mockOvertimeRequests = [];
  }

  public static isMockMode(): boolean {
    if (this.forceMockMode) return true;
    if (process.env.USE_MOCK_REPOSITORY === 'true') return true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || url.includes('placeholder.supabase.co')) {
      return true;
    }
    return false;
  }

  // ==================== ATTENDANCE RECORDS ====================

  static async findByEmployeeDate(
    business_id: string, 
    employee_id: string, 
    attendance_date: string
  ): Promise<AttendanceRecord | null> {
    if (this.isMockMode()) {
      return this.mockAttendanceRecords.find(
        r => r.business_id === business_id && r.employee_id === employee_id && r.attendance_date === attendance_date
      ) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('business_id', business_id)
      .eq('employee_id', employee_id)
      .eq('attendance_date', attendance_date)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to find attendance record: ${error.message}`);
    }

    return (data || null) as AttendanceRecord | null;
  }

  static async findOpenAttendance(
    business_id: string, 
    employee_id: string
  ): Promise<AttendanceRecord | null> {
    if (this.isMockMode()) {
      return this.mockAttendanceRecords.find(
        r => r.business_id === business_id && r.employee_id === employee_id && r.status === 'CHECKED_IN'
      ) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('business_id', business_id)
      .eq('employee_id', employee_id)
      .eq('status', 'CHECKED_IN')
      .order('check_in_time', { ascending: false })
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to find open attendance record: ${error.message}`);
    }

    return (data || null) as AttendanceRecord | null;
  }

  static async getAttendanceById(id: string): Promise<AttendanceRecord | null> {
    if (this.isMockMode()) {
      return this.mockAttendanceRecords.find(r => r.id === id) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get attendance record by id: ${error.message}`);
    }

    return (data || null) as AttendanceRecord | null;
  }

  static async createAttendance(record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    if (this.isMockMode()) {
      const now = new Date().toISOString();
      const newRecord: AttendanceRecord = {
        id: record.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        business_id: record.business_id!,
        employee_id: record.employee_id!,
        branch_id: record.branch_id!,
        attendance_date: record.attendance_date!,
        check_in_time: record.check_in_time!,
        check_in_photo_path: record.check_in_photo_path ?? null,
        check_in_lat: record.check_in_lat ?? null,
        check_in_lng: record.check_in_lng ?? null,
        check_in_accuracy: record.check_in_accuracy ?? null,
        check_in_location_status: record.check_in_location_status || 'AVAILABLE',
        check_out_time: record.check_out_time ?? null,
        check_out_photo_path: record.check_out_photo_path ?? null,
        check_out_lat: record.check_out_lat ?? null,
        check_out_lng: record.check_out_lng ?? null,
        check_out_accuracy: record.check_out_accuracy ?? null,
        check_out_location_status: record.check_out_location_status ?? null,
        status: record.status || 'CHECKED_IN',
        notes: record.notes ?? null,
        created_at: record.created_at || now,
        updated_at: record.updated_at || now,
      };

      // Mock unique constraint check
      const exists = this.mockAttendanceRecords.some(
        r => r.business_id === newRecord.business_id && 
             r.employee_id === newRecord.employee_id && 
             r.attendance_date === newRecord.attendance_date
      );
      if (exists) {
        throw new Error('[Database Error] duplicate key value violates unique constraint "uq_attendance_emp_date"');
      }

      this.mockAttendanceRecords.push(newRecord);
      return { ...newRecord };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .insert([record])
      .select('*')
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to create attendance record: ${error.message}`);
    }

    return data as AttendanceRecord;
  }

  /**
   * Strictly typed checkout update method.
   * Only allows updating check-out related fields.
   * Blocks mutation of business_id, employee_id, branch_id, attendance_date, check_in_time, check_in_photo_path.
   */
  static async checkoutAttendance(id: string, dto: CheckoutAttendanceDTO): Promise<AttendanceRecord> {
    const payload = {
      check_out_time: dto.check_out_time,
      check_out_photo_path: dto.check_out_photo_path,
      check_out_lat: dto.check_out_lat ?? null,
      check_out_lng: dto.check_out_lng ?? null,
      check_out_accuracy: dto.check_out_accuracy ?? null,
      check_out_location_status: dto.check_out_location_status ?? 'AVAILABLE',
      notes: dto.notes ?? null,
      status: 'CHECKED_OUT' as AttendanceStatus,
      updated_at: new Date().toISOString(),
    };

    if (this.isMockMode()) {
      const index = this.mockAttendanceRecords.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error(`[Database Error] Attendance record '${id}' not found for checkout update`);
      }

      const updated: AttendanceRecord = {
        ...this.mockAttendanceRecords[index],
        ...payload,
        notes: dto.notes !== undefined ? dto.notes : this.mockAttendanceRecords[index].notes,
      };
      this.mockAttendanceRecords[index] = updated;
      return { ...updated };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to checkout attendance record: ${error.message}`);
    }

    return data as AttendanceRecord;
  }

  static async updateAttendanceStatus(
    id: string, 
    status: AttendanceStatus, 
    notes?: string
  ): Promise<AttendanceRecord> {
    if (this.isMockMode()) {
      const index = this.mockAttendanceRecords.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error(`[Database Error] Attendance record '${id}' not found for status update`);
      }
      const updated: AttendanceRecord = {
        ...this.mockAttendanceRecords[index],
        status,
        notes: notes !== undefined ? notes : this.mockAttendanceRecords[index].notes,
        updated_at: new Date().toISOString(),
      };
      this.mockAttendanceRecords[index] = updated;
      return { ...updated };
    }

    const supabase = createClient();
    const payload: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (notes !== undefined) payload.notes = notes;

    const { data, error } = await supabase
      .from('attendance_records')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to update attendance status: ${error.message}`);
    }

    return data as AttendanceRecord;
  }

  // ==================== ATTENDANCE REQUESTS (LEAVE) ====================

  static async hasOverlappingLeave(
    business_id: string,
    employee_id: string,
    start_date: string,
    end_date: string,
    excludeRequestId?: string
  ): Promise<boolean> {
    if (this.isMockMode()) {
      return this.mockAttendanceRequests.some(
        r =>
          r.business_id === business_id &&
          r.employee_id === employee_id &&
          (r.status === 'SUBMITTED' || r.status === 'APPROVED') &&
          r.id !== excludeRequestId &&
          start_date <= r.end_date &&
          end_date >= r.start_date
      );
    }

    const supabase = createClient();
    let query = supabase
      .from('attendance_requests')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business_id)
      .eq('employee_id', employee_id)
      .in('status', ['SUBMITTED', 'APPROVED'])
      .lte('start_date', end_date)
      .gte('end_date', start_date);

    if (excludeRequestId) {
      query = query.neq('id', excludeRequestId);
    }

    const { count, error } = await query;
    if (error) {
      throw new Error(`[Database Error] Failed to check overlapping leave: ${error.message}`);
    }

    return (count || 0) > 0;
  }

  static async createLeaveRequest(request: Partial<AttendanceRequest>): Promise<AttendanceRequest> {
    if (this.isMockMode()) {
      const hasOverlap = await this.hasOverlappingLeave(
        request.business_id!,
        request.employee_id!,
        request.start_date!,
        request.end_date!
      );
      if (hasOverlap) {
        throw new AttendanceError(
          'LEAVE_DATE_OVERLAP',
          'Tanggal pengajuan cuti berbenturan dengan pengajuan cuti aktif atau yang sudah disetujui.'
        );
      }

      const now = new Date().toISOString();
      const newRequest: AttendanceRequest = {
        id: request.id || `leave-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        business_id: request.business_id!,
        employee_id: request.employee_id!,
        request_type: request.request_type!,
        start_date: request.start_date!,
        end_date: request.end_date!,
        reason: request.reason!,
        attachment_path: request.attachment_path ?? null,
        status: request.status || 'SUBMITTED',
        reviewed_by_employee_id: request.reviewed_by_employee_id ?? null,
        reviewed_at: request.reviewed_at ?? null,
        rejection_reason: request.rejection_reason ?? null,
        created_at: request.created_at || now,
        updated_at: request.updated_at || now,
      };
      this.mockAttendanceRequests.push(newRequest);
      return { ...newRequest };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_requests')
      .insert([request])
      .select('*')
      .single();

    if (error) {
      if (
        error.code === '23P01' ||
        error.message?.includes('chk_leave_no_overlap') ||
        error.message?.includes('EXCLUDE')
      ) {
        throw new AttendanceError(
          'LEAVE_DATE_OVERLAP',
          'Tanggal pengajuan cuti berbenturan dengan pengajuan cuti aktif atau yang sudah disetujui.'
        );
      }
      throw new Error(`[Database Error] Failed to create leave request: ${error.message}`);
    }

    return data as AttendanceRequest;
  }

  static async getLeaveRequestById(id: string): Promise<AttendanceRequest | null> {
    if (this.isMockMode()) {
      return this.mockAttendanceRequests.find(r => r.id === id) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get leave request by id: ${error.message}`);
    }

    return (data || null) as AttendanceRequest | null;
  }

  static async updateLeaveRequestStatus(
    id: string, 
    status: LeaveRequestStatus, 
    reviewed_by_employee_id: string, 
    rejection_reason?: string,
    reviewed_at?: string
  ): Promise<AttendanceRequest> {
    const timestamp = reviewed_at || new Date().toISOString();
    if (this.isMockMode()) {
      const index = this.mockAttendanceRequests.findIndex(r => r.id === id && r.status === 'SUBMITTED');
      if (index === -1) {
        throw new Error(`[Database Error] Leave request '${id}' not found or already finalized`);
      }
      const updated: AttendanceRequest = {
        ...this.mockAttendanceRequests[index],
        status,
        reviewed_by_employee_id,
        reviewed_at: timestamp,
        rejection_reason: rejection_reason ?? null,
        updated_at: timestamp,
      };
      this.mockAttendanceRequests[index] = updated;
      return { ...updated };
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc('review_leave_request_atomic', {
      p_request_id: id,
      p_status: status,
      p_rejection_reason: rejection_reason || null,
    });

    if (error || !data) {
      throw new Error(`[Database Error] Failed to review leave request: ${error?.message || 'Transaction failed or concurrency conflict'}`);
    }

    return data as AttendanceRequest;
  }

  static async listLeaveRequests(business_id: string, employee_id?: string): Promise<AttendanceRequest[]> {
    if (this.isMockMode()) {
      return this.mockAttendanceRequests.filter(
        r => r.business_id === business_id && (!employee_id || r.employee_id === employee_id)
      );
    }

    const supabase = createClient();
    let query = supabase.from('attendance_requests').select('*').eq('business_id', business_id);
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[Database Error] Failed to list leave requests: ${error.message}`);
    }

    return (data || []) as AttendanceRequest[];
  }

  // ==================== OVERTIME REQUESTS ====================

  static async createOvertimeRequest(request: Partial<OvertimeRequest>): Promise<OvertimeRequest> {
    if (this.isMockMode()) {
      const now = new Date().toISOString();
      const newRequest: OvertimeRequest = {
        id: request.id || `ot-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        business_id: request.business_id!,
        employee_id: request.employee_id!,
        attendance_record_id: request.attendance_record_id ?? null,
        overtime_date: request.overtime_date!,
        claimed_minutes: request.claimed_minutes!,
        approved_minutes: request.approved_minutes ?? null,
        reason: request.reason!,
        status: request.status || 'SUBMITTED',
        reviewed_by_employee_id: request.reviewed_by_employee_id ?? null,
        reviewed_at: request.reviewed_at ?? null,
        created_at: request.created_at || now,
        updated_at: request.updated_at || now,
      };
      this.mockOvertimeRequests.push(newRequest);
      return { ...newRequest };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('overtime_requests')
      .insert([request])
      .select('*')
      .single();

    if (error) {
      throw new Error(`[Database Error] Failed to create overtime request: ${error.message}`);
    }

    return data as OvertimeRequest;
  }

  static async getOvertimeRequestById(id: string): Promise<OvertimeRequest | null> {
    if (this.isMockMode()) {
      return this.mockOvertimeRequests.find(r => r.id === id) || null;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('overtime_requests')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`[Database Error] Failed to get overtime request by id: ${error.message}`);
    }

    return (data || null) as OvertimeRequest | null;
  }

  static async updateOvertimeRequestStatus(
    id: string, 
    status: OvertimeRequestStatus, 
    reviewed_by_employee_id: string, 
    approved_minutes?: number | null,
    rejection_reason?: string | null,
    reviewedAt?: string
  ): Promise<OvertimeRequest> {
    if (this.isMockMode()) {
      const index = this.mockOvertimeRequests.findIndex(r => r.id === id);
      if (index === -1) {
        throw new Error(`[Database Error] Overtime request '${id}' not found`);
      }
      const now = reviewedAt || new Date().toISOString();
      const updated: OvertimeRequest = {
        ...this.mockOvertimeRequests[index],
        status,
        reviewed_by_employee_id,
        reviewed_at: now,
        approved_minutes: status === 'APPROVED' ? (approved_minutes !== undefined ? approved_minutes : this.mockOvertimeRequests[index].approved_minutes) : null,
        rejection_reason: status === 'REJECTED' ? (rejection_reason || null) : null,
        updated_at: now,
      };
      this.mockOvertimeRequests[index] = updated;
      return { ...updated };
    }

    const supabase = createClient();
    const { data, error } = await supabase.rpc('review_overtime_request_atomic', {
      p_overtime_id: id,
      p_status: status,
      p_approved_minutes: approved_minutes ?? null,
      p_rejection_reason: rejection_reason ?? null,
    });

    if (error || !data) {
      throw new Error(`[Database Error] Failed to review overtime request: ${error?.message || 'Transaction failed or concurrency conflict'}`);
    }

    return data as OvertimeRequest;
  }

  static async listOvertimeRequests(business_id: string, employee_id?: string): Promise<OvertimeRequest[]> {
    if (this.isMockMode()) {
      return this.mockOvertimeRequests.filter(
        r => r.business_id === business_id && (!employee_id || r.employee_id === employee_id)
      );
    }

    const supabase = createClient();
    let query = supabase.from('overtime_requests').select('*').eq('business_id', business_id);
    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`[Database Error] Failed to list overtime requests: ${error.message}`);
    }

    return (data || []) as OvertimeRequest[];
  }

  static async listOvertimeRequestsPaginated(params: {
    business_id: string;
    targetEmployeeId?: string;
    allowedBranchIds?: string[];
    status?: OvertimeRequestStatus;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
    sort_by?: 'overtime_date' | 'created_at' | 'status';
    sort_order?: 'asc' | 'desc';
  }): Promise<OvertimeListResult> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const sortBy = params.sort_by || 'overtime_date';
    const sortOrder = params.sort_order || 'desc';

    if (this.isMockMode()) {
      let filtered = this.mockOvertimeRequests.filter(r => r.business_id === params.business_id);

      if (params.status) {
        filtered = filtered.filter(r => r.status === params.status);
      }

      if (params.date_from) {
        filtered = filtered.filter(r => r.overtime_date >= params.date_from!);
      }
      if (params.date_to) {
        filtered = filtered.filter(r => r.overtime_date <= params.date_to!);
      }

      if (params.targetEmployeeId) {
        filtered = filtered.filter(r => r.employee_id === params.targetEmployeeId);
      }

      const employees = await PeopleRepository.listEmployees(params.business_id);
      if (params.allowedBranchIds && params.allowedBranchIds.length > 0) {
        const allowedEmpIds = new Set(
          employees.filter(e => e.branch_id && params.allowedBranchIds!.includes(e.branch_id)).map(e => e.id)
        );
        filtered = filtered.filter(r => allowedEmpIds.has(r.employee_id));
      }

      filtered.sort((a, b) => {
        let valA = (a as any)[sortBy] || '';
        let valB = (b as any)[sortBy] || '';
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        if (a.created_at < b.created_at) return sortOrder === 'asc' ? -1 : 1;
        if (a.created_at > b.created_at) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / limit) || 0;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      const items: OvertimeListItem[] = await Promise.all(
        paginated.map(async r => {
          const emp = employees.find(e => e.id === r.employee_id);
          return {
            id: r.id,
            employee_id: r.employee_id,
            employee_name: emp?.full_name || 'Unknown Employee',
            employee_code: emp?.employee_code || 'EMP-UNKNOWN',
            branch_id: emp?.branch_id || null,
            branch_name: emp?.branch_id ? `Branch ${emp.branch_id}` : null,
            attendance_record_id: r.attendance_record_id,
            overtime_date: r.overtime_date,
            claimed_minutes: r.claimed_minutes,
            approved_minutes: r.approved_minutes,
            reason: r.reason,
            rejection_reason: r.rejection_reason || null,
            status: r.status,
            reviewed_by_employee_id: r.reviewed_by_employee_id,
            reviewed_at: r.reviewed_at,
            created_at: r.created_at,
            updated_at: r.updated_at,
          };
        })
      );

      return {
        items,
        pagination: {
          page,
          limit,
          total_items: totalItems,
          total_pages: totalPages,
        },
      };
    }

    const supabase = createClient();
    let query = supabase
      .from('overtime_requests')
      .select('*, employees!inner(id, full_name, employee_code, branch_id, branches(id, name))', { count: 'exact' })
      .eq('business_id', params.business_id);

    if (params.status) {
      query = query.eq('status', params.status);
    }
    if (params.date_from) {
      query = query.gte('overtime_date', params.date_from);
    }
    if (params.date_to) {
      query = query.lte('overtime_date', params.date_to);
    }
    if (params.targetEmployeeId) {
      query = query.eq('employee_id', params.targetEmployeeId);
    }
    if (params.allowedBranchIds && params.allowedBranchIds.length > 0) {
      query = query.in('employees.branch_id', params.allowedBranchIds);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    if (sortBy !== 'created_at') {
      query = query.order('created_at', { ascending: false });
    }

    const fromIndex = (page - 1) * limit;
    const toIndex = page * limit - 1;
    query = query.range(fromIndex, toIndex);

    const { data, error, count } = await query;
    if (error) {
      throw new Error(`[Database Error] Failed to list overtime requests: ${error.message}`);
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit) || 0;

    const items: OvertimeListItem[] = (data || []).map((row: any) => ({
      id: row.id,
      employee_id: row.employee_id,
      employee_name: row.employees?.full_name || 'Unknown Employee',
      employee_code: row.employees?.employee_code || 'EMP-UNKNOWN',
      branch_id: row.employees?.branch_id || null,
      branch_name: row.employees?.branches?.name || (row.employees?.branch_id ? `Branch ${row.employees.branch_id}` : null),
      attendance_record_id: row.attendance_record_id || null,
      overtime_date: row.overtime_date,
      claimed_minutes: row.claimed_minutes,
      approved_minutes: row.approved_minutes,
      reason: row.reason,
      rejection_reason: row.rejection_reason || null,
      status: row.status,
      reviewed_by_employee_id: row.reviewed_by_employee_id,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total_items: totalItems,
        total_pages: totalPages,
      },
    };
  }
}
