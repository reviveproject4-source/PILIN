import { NextRequest, NextResponse } from 'next/server';
import { AttendanceDomainService } from '@/domains/people/attendanceDomainService';
import { AttendanceRepository } from '@/domains/people/attendanceRepository';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';

export async function GET(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.VIEW);

    // 2. Authoritative server business date derivation
    const todayDate = AttendanceDomainService.deriveBusinessDate(new Date(), 'Asia/Jakarta');

    // 3. Query own attendance record today (Client parameters in query string CANNOT override employee or business scope)
    const record = await AttendanceRepository.findByEmployeeDate(ctx.businessId, ctx.employee.id, todayDate);

    // 4. Success HTTP 200 Response
    return NextResponse.json(
      {
        success: true,
        data: record,
        message: record ? 'Data presensi hari ini ditemukan.' : 'Belum ada presensi untuk hari ini.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
