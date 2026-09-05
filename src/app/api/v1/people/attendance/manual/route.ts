import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.MANAGE);

    // 2. Transport-level JSON parsing
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_JSON', message: 'Malformed JSON payload.' } },
        { status: 400 }
      );
    }

    // 3. Transport-level primitive validation
    const employee_id = typeof body.employee_id === 'string' ? body.employee_id.trim() : '';
    const branch_id = typeof body.branch_id === 'string' ? body.branch_id.trim() : '';
    const attendance_date = typeof body.attendance_date === 'string' ? body.attendance_date.trim() : '';
    const check_in_time = typeof body.check_in_time === 'string' ? body.check_in_time.trim() : '';
    const check_out_time = typeof body.check_out_time === 'string' && body.check_out_time.trim() !== '' ? body.check_out_time.trim() : undefined;
    const photoPath = typeof body.photoPath === 'string' && body.photoPath.trim() !== '' ? body.photoPath.trim() : null;
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!employee_id || !branch_id || !attendance_date || !check_in_time) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Fields employee_id, branch_id, attendance_date, and check_in_time are required.' } },
        { status: 422 }
      );
    }

    // 4. Resolve manager's branch scope from database (membership_branch_scopes)
    const supabase = createClient();
    const { data: scopes } = await supabase
      .from('membership_branch_scopes')
      .select('branch_id');

    const authorizedBranchIds = (scopes || []).map(s => s.branch_id);

    // Check if user is Owner
    const { data: isOwner } = await supabase.rpc('auth_is_owner');

    // 5. Call Domain Service
    const { record } = await AttendanceDomainService.createManualAttendance({
      actorAuthUserId: ctx.userId,
      business_id: ctx.businessId,
      employee_id,
      branch_id,
      attendance_date,
      check_in_time,
      check_out_time,
      photoPath,
      reason,
      isOwner: !!isOwner,
      authorizedBranchIds,
    }, ctx.permissions);

    // 6. Success HTTP 201 Response
    return NextResponse.json(
      {
        success: true,
        data: record,
        message: 'Presensi manual berhasil dicatat oleh Manajer.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
