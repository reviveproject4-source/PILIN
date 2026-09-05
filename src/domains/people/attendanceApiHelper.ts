import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PeopleRepository } from './peopleRepository';
import { AttendanceError } from './attendanceErrors';
import { Employee } from './people.types';

export interface AuthContext {
  userId: string;
  businessId: string;
  employee: Employee;
  permissions: string[];
}

export class AttendanceApiHelper {
  /**
   * Resolves the authenticated session, active business membership, linked employee, and permissions.
   */
  static async resolveAuthContext(requiredPermission?: string): Promise<AuthContext> {
    const supabase = createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      throw new AttendanceError('UNAUTHENTICATED', 'Authentication required. Session is invalid or missing.');
    }

    // Resolve active tenant membership
    const { data: memberships, error: memErr } = await supabase
      .from('tenant_memberships')
      .select('tenant_id, role_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (memErr || !memberships || memberships.length === 0) {
      throw new AttendanceError('UNAUTHORIZED', 'No active tenant membership found for the authenticated user.');
    }

    const businessId = memberships[0].tenant_id;

    // Resolve employee in business tenant
    const employees = await PeopleRepository.listEmployees(businessId);
    const employee = employees.find(e => e.auth_user_id === user.id);

    if (!employee) {
      throw new AttendanceError('EMPLOYEE_NOT_FOUND', `No employee identity linked to authentication user '${user.id}'.`);
    }

    if (employee.employment_status !== 'ACTIVE') {
      throw new AttendanceError('EMPLOYEE_INACTIVE', `Employee '${employee.id}' is INACTIVE / RESIGNED.`);
    }

    // Resolve permission
    const permissions: string[] = [];
    if (requiredPermission) {
      permissions.push(requiredPermission);
    }

    return {
      userId: user.id,
      businessId,
      employee,
      permissions,
    };
  }

  /**
   * Standardized error response handler for Attendance APIs
   */
  static handleError(err: any): NextResponse {
    if (err instanceof AttendanceError) {
      let status = 400;
      switch (err.code) {
        case 'UNAUTHENTICATED':
          status = 401;
          break;
        case 'UNAUTHORIZED':
        case 'EMPLOYEE_INACTIVE':
        case 'SELF_APPROVAL_NOT_ALLOWED':
          status = 403;
          break;
        case 'EMPLOYEE_NOT_FOUND':
        case 'ATTENDANCE_NOT_FOUND':
        case 'LEAVE_NOT_FOUND':
        case 'OVERTIME_NOT_FOUND':
          status = 404;
          break;
        case 'ATTENDANCE_ALREADY_EXISTS':
        case 'DUPLICATE_REQUEST':
        case 'LEAVE_DATE_OVERLAP':
          status = 409;
          break;
        case 'PHOTO_REQUIRED':
        case 'REASON_REQUIRED':
        case 'INVALID_GPS_DATA':
        case 'INVALID_ATTENDANCE_STATE':
        case 'INVALID_LEAVE_STATE':
        case 'INVALID_OVERTIME_STATE':
        case 'INVALID_OVERTIME_MINUTES':
        case 'ATTENDANCE_REQUIRED_FOR_OVERTIME':
        case 'INVALID_INPUT':
          status = 422;
          break;
        default:
          status = 400;
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        },
        { status }
      );
    }

    // Generic error (Hide stack trace / internal SQL details)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected server error occurred while processing attendance.',
        },
      },
      { status: 500 }
    );
  }
}
