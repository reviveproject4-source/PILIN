import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.LEAVE_APPROVE);

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

    // 3. Transport-level primitive validation
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim() : '';
    const rejection_reason = typeof body.rejection_reason === 'string' && body.rejection_reason.trim() !== '' ? body.rejection_reason.trim() : undefined;

    if (!requestId || !status) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT', message: 'Fields requestId and status are required.' } },
        { status: 422 }
      );
    }

    // 4. Resolve reviewer's branch scope from database (membership_branch_scopes)
    const supabase = createClient();
    const { data: scopes } = await supabase
      .from('membership_branch_scopes')
      .select('branch_id');

    const authorizedBranchIds = (scopes || []).map(s => s.branch_id);

    // Check if user is Owner
    const { data: isOwner } = await supabase.rpc('auth_is_owner');

    // 5. Call Domain Service (Client CANNOT override business_id, reviewer_employee_id, reviewed_at, dates, or request_type)
    const { request } = await AttendanceDomainService.reviewLeaveRequest({
      actorAuthUserId: ctx.userId,
      business_id: ctx.businessId,
      requestId,
      status: status as any,
      rejection_reason,
      isOwner: !!isOwner,
      authorizedBranchIds,
    }, ctx.permissions);

    // 6. Success HTTP 200 Response
    return NextResponse.json(
      {
        success: true,
        data: request,
        message: status === 'APPROVED' ? 'Pengajuan ijin telah disetujui.' : 'Pengajuan ijin telah ditolak.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
