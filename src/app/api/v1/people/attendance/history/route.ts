import { NextRequest, NextResponse } from 'next/server';
import { AttendanceApiHelper } from '@/domains/people/attendanceApiHelper';
import { ATTENDANCE_PERMISSIONS } from '@/domains/people/attendancePermissions';
import { createClient } from '@/lib/supabase/server';
import { AttendanceRecord } from '@/domains/people/attendance.types';

export async function GET(req: NextRequest) {
  try {
    // 1. Resolve authenticated context server-side
    const ctx = await AttendanceApiHelper.resolveAuthContext(ATTENDANCE_PERMISSIONS.VIEW);

    // 2. Default self-service scope: query own attendance records only
    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('employee_id', ctx.employee.id)
      .order('attendance_date', { ascending: false });

    if (error) {
      throw new Error(`[Database Error] Failed to fetch attendance history: ${error.message}`);
    }

    const records = (data || []) as AttendanceRecord[];

    // 3. Success HTTP 200 Response
    return NextResponse.json(
      {
        success: true,
        data: records,
        message: 'Daftar riwayat presensi berhasil diambil.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return AttendanceApiHelper.handleError(err);
  }
}
