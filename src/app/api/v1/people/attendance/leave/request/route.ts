import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.LEAVE_REQUEST);

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
    const request_type = typeof body.request_type === 'string' ? body.request_type.trim() : '';
    const start_date = typeof body.start_date === 'string' ? body.start_date.trim() : '';
    const end_date = typeof body.end_date === 'string' ? body.end_date.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    let attachment_path: string | null = null;
    if (body.attachment_path !== undefined && body.attachment_path !== null) {
      if (typeof body.attachment_path !== 'string') {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Field attachment_path must be a string or null.' } },
          { status: 422 }
        );
      }
      attachment_path = body.attachment_path.trim() || null;
    }

    // 4. Call Domain Service (Client CANNOT override employee_id, business_id, status, reviewer fields)
    const { request } = await AttendanceDomainService.submitLeaveRequest({
      authUserId: ctx.userId,
      business_id: ctx.businessId,
      request_type: request_type as any,
      start_date,
      end_date,
      reason,
      attachment_path,
    }, ctx.permissions);

    // 5. Success HTTP 201 Response
    return NextResponse.json(
      {
        success: true,
        data: request,
        message: 'Pengajuan ijin/cuti berhasil dikirim.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
