export type LocationStatus = 'AVAILABLE' | 'DENIED' | 'UNAVAILABLE' | 'INACCURATE' | 'MANUAL_ENTRY';
export type AttendanceStatus = 'CHECKED_IN' | 'CHECKED_OUT' | 'AUTO_CLOSED';
export type LeaveRequestType = 'SICK' | 'PERMISSION' | 'ANNUAL_LEAVE' | 'EMERGENCY';
export type LeaveRequestStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type OvertimeRequestStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';

// ==================== CLOCK ABSTRACTION ====================

export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  constructor(private fixedTime: Date) {}

  now(): Date {
    return new Date(this.fixedTime.getTime());
  }

  setTime(newTime: Date): void {
    this.fixedTime = new Date(newTime.getTime());
  }
}

// ==================== ENTITIES ====================

export interface AttendanceRecord {
  id: string;
  business_id: string;
  employee_id: string;
  branch_id: string;
  attendance_date: string; // YYYY-MM-DD
  check_in_time: string; // ISO TIMESTAMPTZ
  check_in_photo_path: string | null;
  check_in_lat: number | null;
  check_in_lng: number | null;
  check_in_accuracy: number | null;
  check_in_location_status: LocationStatus;
  check_out_time: string | null; // ISO TIMESTAMPTZ
  check_out_photo_path: string | null;
  check_out_lat: number | null;
  check_out_lng: number | null;
  check_out_accuracy: number | null;
  check_out_location_status: LocationStatus | null;
  status: AttendanceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRequest {
  id: string;
  business_id: string;
  employee_id: string;
  request_type: LeaveRequestType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  reason: string;
  attachment_path: string | null;
  status: LeaveRequestStatus;
  reviewed_by_employee_id: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimeRequest {
  id: string;
  business_id: string;
  employee_id: string;
  attendance_record_id: string | null;
  overtime_date: string; // YYYY-MM-DD
  claimed_minutes: number;
  approved_minutes: number | null;
  rejection_reason?: string | null;
  reason: string;
  status: OvertimeRequestStatus;
  reviewed_by_employee_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== DTOS ====================

export interface ClockInDTO {
  authUserId: string;
  business_id: string;
  branch_id: string;
  photoPath: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  locationStatus?: LocationStatus;
  notes?: string;
  timeZone?: string; // Optional branch/tenant timezone (e.g. 'Asia/Jakarta')
}

export interface ClockOutDTO {
  authUserId: string;
  business_id: string;
  attendanceId?: string;
  photoPath: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  locationStatus?: LocationStatus;
  notes?: string;
}

export interface CheckoutAttendanceDTO {
  check_out_time: string;
  check_out_photo_path: string;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  check_out_accuracy?: number | null;
  check_out_location_status?: LocationStatus | null;
  notes?: string | null;
}

export interface CreateManualAttendanceDTO {
  actorAuthUserId: string;
  business_id: string;
  employee_id: string;
  branch_id: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time?: string;
  photoPath?: string | null;
  reason: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  isOwner?: boolean;
  authorizedBranchIds?: string[]; // Security scope from membership_branch_scopes
}

export interface SubmitLeaveRequestDTO {
  authUserId: string;
  business_id: string;
  request_type: LeaveRequestType;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_path?: string | null;
}

export interface ReviewLeaveRequestDTO {
  actorAuthUserId: string;
  business_id: string;
  requestId: string;
  status: 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  isOwner?: boolean;
}

export interface SubmitOvertimeRequestDTO {
  authUserId: string;
  business_id: string;
  attendance_record_id: string;
  claimed_minutes: number;
  reason: string;
}

export interface ReviewOvertimeRequestDTO {
  actorAuthUserId: string;
  business_id: string;
  overtimeId: string;
  status: 'APPROVED' | 'REJECTED';
  approved_minutes?: number;
  rejection_reason?: string;
  authorizedBranchIds?: string[];
  isOwner?: boolean;
}

export interface ListOvertimeQueryDTO {
  actorAuthUserId: string;
  business_id: string;
  status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  date_from?: string;
  date_to?: string;
  employee_id?: string;
  branch_id?: string;
  page?: number;
  limit?: number;
  sort_by?: 'overtime_date' | 'created_at' | 'status';
  sort_order?: 'asc' | 'desc';
  isOwner?: boolean;
  authorizedBranchIds?: string[];
}

export interface OvertimeListItem {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  branch_id: string | null;
  branch_name: string | null;
  attendance_record_id: string | null;
  overtime_date: string;
  claimed_minutes: number;
  approved_minutes: number | null;
  reason: string;
  rejection_reason: string | null;
  status: OvertimeRequestStatus;
  reviewed_by_employee_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OvertimeListResult {
  items: OvertimeListItem[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
  };
}

