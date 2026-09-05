import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';
import { createClient } from '@/lib/supabase/server';
import { AttendanceError } from '@/domains/people/attendanceErrors';

export async function GET(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.OVERTIME_REQUEST);

    // 2. Parse URL query parameters
    const { searchParams } = new URL(req.url);

    // Status filter validation
    const rawStatus = searchParams.get('status')?.trim();
    let status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | undefined = undefined;
    if (rawStatus) {
      if (rawStatus !== 'SUBMITTED' && rawStatus !== 'APPROVED' && rawStatus !== 'REJECTED') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Status must be SUBMITTED, APPROVED, or REJECTED.' } },
          { status: 422 }
        );
      }
      status = rawStatus as any;
    }

    // Date range validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const date_from = searchParams.get('date_from')?.trim() || undefined;
    if (date_from && !dateRegex.test(date_from)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field date_from must be in YYYY-MM-DD format.' } },
        { status: 422 }
      );
    }

    const date_to = searchParams.get('date_to')?.trim() || undefined;
    if (date_to && !dateRegex.test(date_to)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field date_to must be in YYYY-MM-DD format.' } },
        { status: 422 }
      );
    }

    if (date_from && date_to && date_from > date_to) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field date_from cannot be after date_to.' } },
        { status: 422 }
      );
    }

    // UUID format check for optional employee_id & branch_id filters
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const employee_id = searchParams.get('employee_id')?.trim() || undefined;
    if (employee_id && employee_id.length > 20 && !uuidRegex.test(employee_id)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field employee_id must be a valid UUID.' } },
        { status: 422 }
      );
    }

    const branch_id = searchParams.get('branch_id')?.trim() || undefined;
    if (branch_id && branch_id.length > 20 && !uuidRegex.test(branch_id)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field branch_id must be a valid UUID.' } },
        { status: 422 }
      );
    }

    // Pagination parameters validation
    const rawPage = searchParams.get('page');
    let page = 1;
    if (rawPage !== null) {
      page = parseInt(rawPage, 10);
      if (isNaN(page) || page < 1) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Page must be an integer greater than or equal to 1.' } },
          { status: 422 }
        );
      }
    }

    const rawLimit = searchParams.get('limit');
    let limit = 20;
    if (rawLimit !== null) {
      limit = parseInt(rawLimit, 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Limit must be an integer between 1 and 100.' } },
          { status: 422 }
        );
      }
    }

    // Sorting parameters validation
    const rawSortBy = searchParams.get('sort_by')?.trim();
    let sort_by: 'overtime_date' | 'created_at' | 'status' | undefined = undefined;
    if (rawSortBy) {
      if (rawSortBy !== 'overtime_date' && rawSortBy !== 'created_at' && rawSortBy !== 'status') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Field sort_by must be overtime_date, created_at, or status.' } },
          { status: 422 }
        );
      }
      sort_by = rawSortBy as any;
    }

    const rawSortOrder = searchParams.get('sort_order')?.trim();
    let sort_order: 'asc' | 'desc' | undefined = undefined;
    if (rawSortOrder) {
      if (rawSortOrder !== 'asc' && rawSortOrder !== 'desc') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Field sort_order must be asc or desc.' } },
          { status: 422 }
        );
      }
      sort_order = rawSortOrder as any;
    }

    // 3. Resolve reviewer's branch scope from database (membership_branch_scopes) & Owner status
    const supabase = createClient();
    const { data: scopes } = await supabase
      .from('membership_branch_scopes')
      .select('branch_id');

    const authorizedBranchIds = (scopes || []).map(s => s.branch_id);
    const { data: isOwner } = await supabase.rpc('auth_is_owner');

    // 4. Execute domain service query
    const result = await AttendanceDomainService.listOvertimeRequests(
      {
        actorAuthUserId: ctx.userId,
        business_id: ctx.businessId,
        status,
        date_from,
        date_to,
        employee_id,
        branch_id,
        page,
        limit,
        sort_by,
        sort_order,
        isOwner: !!isOwner,
        authorizedBranchIds,
      },
      ctx.permissions
    );

    // 5. Return HTTP 200 OK Response
    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Daftar pengajuan lembur berhasil diambil.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
