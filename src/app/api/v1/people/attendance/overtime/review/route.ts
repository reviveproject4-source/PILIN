import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';
import { createClient } from '@/lib/supabase/server';
import { AttendanceError } from '@/domains/people/attendanceErrors';

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.OVERTIME_APPROVE);

    // 2. Transport-level JSON parsing
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Malformed JSON payload.' } },
        { status: 422 }
      );
    }

    // 3. Transport-level primitive & type validation
    const rawOvertimeId = body.overtime_id || body.overtimeId;
    if (typeof rawOvertimeId !== 'string' || rawOvertimeId.trim() === '') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field overtime_id or overtimeId is required.' } },
        { status: 422 }
      );
    }
    const overtimeId = rawOvertimeId.trim();

    // Basic UUID format check if string length > 20 but invalid UUID structure
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (overtimeId.length > 20 && !uuidRegex.test(overtimeId)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Field overtime_id must be a valid UUID.' } },
        { status: 422 }
      );
    }

    const status = typeof body.status === 'string' ? body.status.trim() : '';
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_OVERTIME_STATE', message: 'Status must be APPROVED or REJECTED.' } },
        { status: 422 }
      );
    }

    let approved_minutes: number | undefined = undefined;
    if (body.approved_minutes !== undefined && body.approved_minutes !== null) {
      if (
        typeof body.approved_minutes !== 'number' ||
        !Number.isInteger(body.approved_minutes) ||
        body.approved_minutes <= 0
      ) {
        throw new AttendanceError('INVALID_OVERTIME_MINUTES', 'Approved overtime minutes must be a positive integer greater than 0.');
      }
      approved_minutes = body.approved_minutes;
    }

    let rejection_reason: string | undefined = undefined;
    if (body.rejection_reason !== undefined && body.rejection_reason !== null) {
      if (typeof body.rejection_reason !== 'string') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Field rejection_reason must be a string or null.' } },
          { status: 422 }
        );
      }
      rejection_reason = body.rejection_reason;
    }

    // 4. Resolve reviewer's branch scope from database (membership_branch_scopes) & Owner status
    const supabase = createClient();
    const { data: scopes } = await supabase
      .from('membership_branch_scopes')
      .select('branch_id');

    const authorizedBranchIds = (scopes || []).map(s => s.branch_id);
    const { data: isOwner } = await supabase.rpc('auth_is_owner');

    // 5. Call Domain Service (Server resolves reviewer, tenant, applicant branch; enforces self-approval guard & invariants)
    const { request } = await AttendanceDomainService.reviewOvertimeRequest(
      {
        actorAuthUserId: ctx.userId,
        business_id: ctx.businessId,
        overtimeId,
        status: status as any,
        approved_minutes,
        rejection_reason,
        isOwner: !!isOwner,
        authorizedBranchIds,
      },
      ctx.permissions
    );

    // 6. Return HTTP 200 OK Response
    return NextResponse.json(
      {
        success: true,
        data: request,
        message: 'Overtime request reviewed successfully.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
