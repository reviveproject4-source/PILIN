import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';

export async function POST(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.RECORD);

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
    const photoPath = body.photoPath && typeof body.photoPath === 'string' ? body.photoPath.trim() : '';
    const lat = typeof body.lat === 'number' ? body.lat : null;
    const lng = typeof body.lng === 'number' ? body.lng : null;
    const accuracy = typeof body.accuracy === 'number' ? body.accuracy : null;
    const locationStatus = typeof body.locationStatus === 'string' ? body.locationStatus : undefined;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

    // 4. Call Domain Service (Client CANNOT override employee_id, business_id, branch_id, attendance_date, or serverTimeIso)
    const { record } = await AttendanceDomainService.clockIn({
      authUserId: ctx.userId,
      business_id: ctx.businessId,
      branch_id: ctx.employee.branch_id || '00000000-0000-0000-0000-000000000000',
      photoPath,
      lat,
      lng,
      accuracy,
      locationStatus: locationStatus as any,
      notes,
    }, ctx.permissions);

    // 5. Success HTTP 201 Response
    return NextResponse.json(
      {
        success: true,
        data: record,
        message: 'Clock-in berhasil dicatat.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
