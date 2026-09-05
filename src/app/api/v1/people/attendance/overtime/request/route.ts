import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';
import { AttendanceError } from '@/domains/people/attendanceErrors';

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.OVERTIME_REQUEST);

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
    if (typeof body.attendance_record_id !== 'string' || body.attendance_record_id.trim() === '') {
      throw new AttendanceError('ATTENDANCE_REQUIRED_FOR_OVERTIME', 'Overtime request requires a valid checked-out attendance record id.');
    }
    const attendance_record_id = body.attendance_record_id.trim();

    if (
      typeof body.claimed_minutes !== 'number' ||
      !Number.isInteger(body.claimed_minutes) ||
      body.claimed_minutes <= 0
    ) {
      throw new AttendanceError('INVALID_OVERTIME_MINUTES', 'Claimed overtime minutes must be a positive integer greater than 0.');
    }
    const claimed_minutes = body.claimed_minutes;

    if (typeof body.reason !== 'string' || body.reason.trim() === '') {
      throw new AttendanceError('REASON_REQUIRED', 'Reason is required for submitting an overtime request.');
    }
    const reason = body.reason.trim();

    // 4. Call Domain Service (Server resolves employee, tenant, branch, overtime_date; enforces CHECKED_OUT status & duplicate checks)
    const { request } = await AttendanceDomainService.submitOvertimeRequest(
      {
        authUserId: ctx.userId,
        business_id: ctx.businessId,
        attendance_record_id,
        claimed_minutes,
        reason,
      },
      ctx.permissions
    );

    // 5. Return HTTP 201 Response
    return NextResponse.json(
      {
        success: true,
        data: request,
        message: 'Pengajuan overtime berhasil dikirim.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
