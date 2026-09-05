import { Employee } from './people.types';
import { ATTENDANCE_PERMISSIONS } from './attendancePermissions';
import { AttendanceError } from './attendanceErrors';

export class AttendancePolicy {
  /**
   * Validates if an employee has permission to clock-in/out self-service
   */
  static canRecordAttendance(permissions: string[]): boolean {
    return permissions.includes(ATTENDANCE_PERMISSIONS.RECORD) || permissions.includes('*');
  }

  /**
   * Validates if an actor has permission for managerial attendance entry
   */
  static canManageAttendance(permissions: string[], isOwner?: boolean): boolean {
    if (isOwner) return true;
    return permissions.includes(ATTENDANCE_PERMISSIONS.MANAGE) || permissions.includes('*');
  }

  /**
   * Validates if an employee can submit leave requests
   */
  static canRequestLeave(permissions: string[]): boolean {
    return permissions.includes(ATTENDANCE_PERMISSIONS.LEAVE_REQUEST) || permissions.includes('*');
  }

  /**
   * Validates if an actor can review/approve leave requests
   */
  static canApproveLeave(permissions: string[], isOwner?: boolean): boolean {
    if (isOwner) return true;
    return permissions.includes(ATTENDANCE_PERMISSIONS.LEAVE_APPROVE) || permissions.includes('*');
  }

  /**
   * Validates if an employee can submit overtime requests
   */
  static canRequestOvertime(permissions: string[]): boolean {
    return permissions.includes(ATTENDANCE_PERMISSIONS.OVERTIME_REQUEST) || permissions.includes('*');
  }

  /**
   * Validates if an actor can review/approve overtime requests
   */
  static canApproveOvertime(permissions: string[], isOwner?: boolean): boolean {
    if (isOwner) return true;
    return permissions.includes(ATTENDANCE_PERMISSIONS.OVERTIME_APPROVE) || permissions.includes('*');
  }

  /**
   * Enforces self-approval prohibition (actor employee cannot review their own request)
   */
  static enforceNotSelfReview(actorEmployeeId: string, targetEmployeeId: string): void {
    if (actorEmployeeId === targetEmployeeId) {
      throw new AttendanceError(
        'SELF_APPROVAL_NOT_ALLOWED',
        'Self-approval is strictly prohibited. An employee cannot review or approve their own request.'
      );
    }
  }

  /**
   * Validates branch security scope for manager operations.
   * Priority:
   * 1. Owner role -> Tenant wide
   * 2. authorizedBranchIds (membership_branch_scopes) -> Primary security authority
   * 3. Fallback to direct home branch ONLY if authorizedBranchIds array is omitted
   */
  static validateBranchAccess(
    actorEmployee: Employee,
    targetBranchId: string,
    authorizedBranchIds?: string[],
    isOwner?: boolean
  ): void {
    if (isOwner) return;

    // Security scope (membership_branch_scopes) is primary authority
    if (authorizedBranchIds !== undefined && authorizedBranchIds !== null) {
      if (authorizedBranchIds.includes(targetBranchId)) return;
      throw new AttendanceError(
        'UNAUTHORIZED',
        `Actor employee '${actorEmployee.id}' does not have authorized branch scope for target branch '${targetBranchId}'.`
      );
    }

    // Fallback to direct home branch only if no explicit authorizedBranchIds array provided
    if (actorEmployee.branch_id === targetBranchId) return;

    throw new AttendanceError(
      'UNAUTHORIZED',
      `Actor employee '${actorEmployee.id}' does not have branch authority over target branch '${targetBranchId}'.`
    );
  }
}
