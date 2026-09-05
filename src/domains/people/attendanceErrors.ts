export type AttendanceErrorCode =
  | 'UNAUTHENTICATED'
  | 'EMPLOYEE_NOT_FOUND'
  | 'EMPLOYEE_INACTIVE'
  | 'UNAUTHORIZED'
  | 'ATTENDANCE_ALREADY_EXISTS'
  | 'ATTENDANCE_NOT_FOUND'
  | 'INVALID_ATTENDANCE_STATE'
  | 'PHOTO_REQUIRED'
  | 'INVALID_GPS_DATA'
  | 'INVALID_MANUAL_ATTENDANCE'
  | 'REASON_REQUIRED'
  | 'LEAVE_NOT_FOUND'
  | 'INVALID_LEAVE_STATE'
  | 'LEAVE_DATE_OVERLAP'
  | 'SELF_APPROVAL_NOT_ALLOWED'
  | 'OVERTIME_NOT_FOUND'
  | 'INVALID_OVERTIME_STATE'
  | 'INVALID_OVERTIME_MINUTES'
  | 'ATTENDANCE_REQUIRED_FOR_OVERTIME'
  | 'DUPLICATE_REQUEST'
  | 'INVALID_INPUT';

export class AttendanceError extends Error {
  public readonly code: AttendanceErrorCode;
  public readonly details?: Record<string, any>;

  constructor(code: AttendanceErrorCode, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'AttendanceError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AttendanceError.prototype);
  }
}
