export const ATTENDANCE_PERMISSIONS = {
  VIEW: 'people:attendance:view',
  RECORD: 'people:attendance:record',
  MANAGE: 'people:attendance:manage',
  LEAVE_REQUEST: 'people:leave:request',
  LEAVE_APPROVE: 'people:leave:approve',
  OVERTIME_REQUEST: 'people:overtime:request',
  OVERTIME_APPROVE: 'people:overtime:approve',
} as const;

export type AttendancePermission = typeof ATTENDANCE_PERMISSIONS[keyof typeof ATTENDANCE_PERMISSIONS];
