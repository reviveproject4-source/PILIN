import { PeopleRepository } from './peopleRepository';
import { AttendanceRepository } from './attendanceRepository';
import { AttendancePolicy } from './attendancePolicy';
import { AttendanceError } from './attendanceErrors';
import { ATTENDANCE_PERMISSIONS } from './attendancePermissions';
import { AuditLogger } from '../control/auditLogger';
import { Employee } from './people.types';
import { 
  AttendanceRecord, AttendanceRequest, OvertimeRequest, 
  ClockInDTO, ClockOutDTO, CreateManualAttendanceDTO, 
  SubmitLeaveRequestDTO, ReviewLeaveRequestDTO, 
  SubmitOvertimeRequestDTO, ReviewOvertimeRequestDTO,
  ListOvertimeQueryDTO, OvertimeListResult,
  Clock, SystemClock
} from './attendance.types';

export class AttendanceDomainService {

  /**
   * Internal helper to resolve an Employee by authUserId in a business tenant
   */
  private static async resolveEmployeeByAuthUser(business_id: string, authUserId: string): Promise<Employee> {
    const employees = await PeopleRepository.listEmployees(business_id);
    const employee = employees.find(e => e.auth_user_id === authUserId);

    if (!employee) {
      throw new AttendanceError(
        'EMPLOYEE_NOT_FOUND',
        `No employee identity linked to authentication user '${authUserId}' in business tenant '${business_id}'.`
      );
    }

    if (employee.employment_status !== 'ACTIVE') {
      throw new AttendanceError(
        'EMPLOYEE_INACTIVE',
        `Employee '${employee.id}' (${employee.full_name}) is currently INACTIVE / RESIGNED.`
      );
    }

    return employee;
  }

  /**
   * Internal helper to resolve target Employee by id
   */
  private static async resolveEmployeeById(business_id: string, employee_id: string): Promise<Employee> {
    const employee = await PeopleRepository.getEmployeeById(employee_id);

    if (!employee || employee.business_id !== business_id) {
      throw new AttendanceError(
        'EMPLOYEE_NOT_FOUND',
        `Employee '${employee_id}' not found in business tenant '${business_id}'.`
      );
    }

    if (employee.employment_status !== 'ACTIVE') {
      throw new AttendanceError(
        'EMPLOYEE_INACTIVE',
        `Target employee '${employee.id}' is INACTIVE / RESIGNED.`
      );
    }

    return employee;
  }

  /**
   * Timezone-aware business date derivation (YYYY-MM-DD) from a Date object
   * Uses IANA timezone (default: 'Asia/Jakarta')
   */
  public static deriveBusinessDate(date: Date, timeZone: string = 'Asia/Jakarta'): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    } catch (e) {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(date);
    }
  }

  /**
   * Internal helper to validate numeric GPS coordinates
   */
  private static validateGpsData(lat?: number | null, lng?: number | null, accuracy?: number | null): void {
    if (lat !== undefined && lat !== null && (lat < -90 || lat > 90)) {
      throw new AttendanceError('INVALID_GPS_DATA', `Latitude ${lat} is out of valid range (-90 to 90).`);
    }
    if (lng !== undefined && lng !== null && (lng < -180 || lng > 180)) {
      throw new AttendanceError('INVALID_GPS_DATA', `Longitude ${lng} is out of valid range (-180 to 180).`);
    }
    if (accuracy !== undefined && accuracy !== null && accuracy < 0) {
      throw new AttendanceError('INVALID_GPS_DATA', `Accuracy ${accuracy} cannot be negative.`);
    }
  }

  // ============================================================================
  // 1. CLOCK-IN (SELF SERVICE)
  // ============================================================================

  static async clockIn(
    dto: ClockInDTO, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.RECORD],
    clock: Clock = new SystemClock()
  ): Promise<{ record: AttendanceRecord; auditLog: any }> {
    const employee = await this.resolveEmployeeByAuthUser(dto.business_id, dto.authUserId);

    if (!AttendancePolicy.canRecordAttendance(permissionCodes)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks permission '${ATTENDANCE_PERMISSIONS.RECORD}' for self-service clock-in.`);
    }

    if (!dto.photoPath || dto.photoPath.trim() === '') {
      throw new AttendanceError('PHOTO_REQUIRED', 'Self-service clock-in strictly requires a live camera selfie photo.');
    }

    this.validateGpsData(dto.lat, dto.lng, dto.accuracy);

    // Authoritative Server Clock
    const serverNow = clock.now();
    const nowIso = serverNow.toISOString();
    const attendanceDate = this.deriveBusinessDate(serverNow, dto.timeZone || 'Asia/Jakarta');

    // Duplicate Check
    const existing = await AttendanceRepository.findByEmployeeDate(dto.business_id, employee.id, attendanceDate);
    if (existing) {
      throw new AttendanceError(
        'ATTENDANCE_ALREADY_EXISTS',
        `Employee '${employee.id}' has already checked in for business date '${attendanceDate}'.`,
        { existingAttendanceId: existing.id }
      );
    }

    const record = await AttendanceRepository.createAttendance({
      business_id: dto.business_id,
      employee_id: employee.id,
      branch_id: dto.branch_id || employee.branch_id || '00000000-0000-0000-0000-000000000000',
      attendance_date: attendanceDate,
      check_in_time: nowIso,
      check_in_photo_path: dto.photoPath,
      check_in_lat: dto.lat ?? null,
      check_in_lng: dto.lng ?? null,
      check_in_accuracy: dto.accuracy ?? null,
      check_in_location_status: dto.locationStatus || 'AVAILABLE',
      status: 'CHECKED_IN',
      notes: dto.notes ?? null,
    });

    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      'CLOCK_IN',
      'attendance_records',
      dto.authUserId,
      record.branch_id,
      record.id,
      {
        employee_id: employee.id,
        attendance_date: attendanceDate,
        location_status: record.check_in_location_status,
      }
    );

    // Audit Persistence Architecture
    await AuditLogger.log(auditLog);

    return { record, auditLog };
  }

  // ============================================================================
  // 2. CLOCK-OUT (SELF SERVICE)
  // ============================================================================

  static async clockOut(
    dto: ClockOutDTO, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.RECORD],
    clock: Clock = new SystemClock()
  ): Promise<{ record: AttendanceRecord; auditLog: any }> {
    const employee = await this.resolveEmployeeByAuthUser(dto.business_id, dto.authUserId);

    if (!AttendancePolicy.canRecordAttendance(permissionCodes)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks permission '${ATTENDANCE_PERMISSIONS.RECORD}' for self-service clock-out.`);
    }

    if (!dto.photoPath || dto.photoPath.trim() === '') {
      throw new AttendanceError('PHOTO_REQUIRED', 'Self-service clock-out strictly requires a live camera selfie photo.');
    }

    this.validateGpsData(dto.lat, dto.lng, dto.accuracy);

    let openAttendance: AttendanceRecord | null = null;
    if (dto.attendanceId) {
      openAttendance = await AttendanceRepository.getAttendanceById(dto.attendanceId);
    } else {
      openAttendance = await AttendanceRepository.findOpenAttendance(dto.business_id, employee.id);
    }

    if (!openAttendance) {
      throw new AttendanceError('ATTENDANCE_NOT_FOUND', `No open CHECKED_IN attendance record found for employee '${employee.id}'.`);
    }

    if (openAttendance.status !== 'CHECKED_IN') {
      throw new AttendanceError(
        'INVALID_ATTENDANCE_STATE',
        `Cannot clock out attendance in status '${openAttendance.status}'. Must be 'CHECKED_IN'.`
      );
    }

    // Authoritative Server Clock
    const serverNow = clock.now();
    const nowIso = serverNow.toISOString();

    if (serverNow < new Date(openAttendance.check_in_time)) {
      throw new AttendanceError('INVALID_ATTENDANCE_STATE', 'Clock-out time cannot be earlier than clock-in time.');
    }

    // Strictly typed checkout update
    const record = await AttendanceRepository.checkoutAttendance(openAttendance.id, {
      check_out_time: nowIso,
      check_out_photo_path: dto.photoPath,
      check_out_lat: dto.lat ?? null,
      check_out_lng: dto.lng ?? null,
      check_out_accuracy: dto.accuracy ?? null,
      check_out_location_status: dto.locationStatus || 'AVAILABLE',
      notes: dto.notes !== undefined ? dto.notes : openAttendance.notes,
    });

    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      'CLOCK_OUT',
      'attendance_records',
      dto.authUserId,
      record.branch_id,
      record.id,
      {
        employee_id: employee.id,
        check_in_time: record.check_in_time,
        check_out_time: record.check_out_time,
      }
    );

    // Audit Persistence Architecture
    await AuditLogger.log(auditLog);

    return { record, auditLog };
  }

  // ============================================================================
  // 3. MANUAL ATTENDANCE BY AUTHORIZED MANAGER
  // ============================================================================

  static async createManualAttendance(
    dto: CreateManualAttendanceDTO, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.MANAGE],
    clock: Clock = new SystemClock()
  ): Promise<{ record: AttendanceRecord; auditLog: any }> {
    const actor = await this.resolveEmployeeByAuthUser(dto.business_id, dto.actorAuthUserId);

    if (!AttendancePolicy.canManageAttendance(permissionCodes, dto.isOwner)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks managerial permission '${ATTENDANCE_PERMISSIONS.MANAGE}' for manual attendance entry.`);
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new AttendanceError('REASON_REQUIRED', 'Reason/Notes are strictly required for manual attendance entry.');
    }

    const targetEmployee = await this.resolveEmployeeById(dto.business_id, dto.employee_id);

    // Validate security scope (membership_branch_scopes)
    AttendancePolicy.validateBranchAccess(actor, dto.branch_id, dto.authorizedBranchIds, dto.isOwner);

    // Date & Time Integrity Validations
    const todayStr = this.deriveBusinessDate(clock.now(), 'Asia/Jakarta');
    if (dto.attendance_date > todayStr) {
      throw new AttendanceError('INVALID_ATTENDANCE_STATE', `Manual attendance entry date '${dto.attendance_date}' cannot be in the future (today is '${todayStr}').`);
    }

    const targetDateObj = new Date(dto.attendance_date);
    const todayDateObj = new Date(todayStr);
    const diffDays = Math.floor((todayDateObj.getTime() - targetDateObj.getTime()) / (1000 * 3600 * 24));
    if (diffDays > 30) {
      throw new AttendanceError('INVALID_ATTENDANCE_STATE', `Manual attendance entry date '${dto.attendance_date}' exceeds the 30-day historical correction window.`);
    }

    if (dto.check_out_time && new Date(dto.check_in_time) > new Date(dto.check_out_time)) {
      throw new AttendanceError('INVALID_ATTENDANCE_STATE', 'Check-in time cannot be later than check-out time.');
    }

    const derivedCheckInDate = this.deriveBusinessDate(new Date(dto.check_in_time), 'Asia/Jakarta');
    if (derivedCheckInDate !== dto.attendance_date) {
      throw new AttendanceError('INVALID_ATTENDANCE_STATE', `Attendance date '${dto.attendance_date}' does not match check-in local date '${derivedCheckInDate}'.`);
    }

    // Check duplicate
    const existing = await AttendanceRepository.findByEmployeeDate(dto.business_id, targetEmployee.id, dto.attendance_date);
    if (existing) {
      throw new AttendanceError(
        'ATTENDANCE_ALREADY_EXISTS',
        `Employee '${targetEmployee.id}' already has an attendance record for date '${dto.attendance_date}'.`
      );
    }

    // Photo is OPTIONAL: NULL if not provided. NEVER use placeholder text strings!
    const photoPath = (dto.photoPath && dto.photoPath.trim() !== '') ? dto.photoPath.trim() : null;

    const record = await AttendanceRepository.createAttendance({
      business_id: dto.business_id,
      employee_id: targetEmployee.id,
      branch_id: dto.branch_id,
      attendance_date: dto.attendance_date,
      check_in_time: dto.check_in_time,
      check_in_photo_path: photoPath,
      check_in_location_status: 'MANUAL_ENTRY',
      check_out_time: dto.check_out_time ?? null,
      check_out_photo_path: dto.check_out_time ? photoPath : null,
      check_out_location_status: dto.check_out_time ? 'MANUAL_ENTRY' : null,
      status: dto.check_out_time ? 'CHECKED_OUT' : 'CHECKED_IN',
      notes: `[MANUAL ENTRY BY ${actor.full_name}]: ${dto.reason.trim()}`,
    });

    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      'MANUAL_ATTENDANCE_ENTRY',
      'attendance_records',
      dto.actorAuthUserId,
      dto.branch_id,
      record.id,
      {
        target_employee_id: targetEmployee.id,
        attendance_date: dto.attendance_date,
        reason: dto.reason.trim(),
        has_photo: photoPath !== null,
      }
    );

    // Audit Persistence Architecture
    await AuditLogger.log(auditLog);

    return { record, auditLog };
  }

  // ============================================================================
  // 4. LEAVE WORKFLOW (IJIN / SAKIT / CUTI)
  // ============================================================================

  static async submitLeaveRequest(
    dto: SubmitLeaveRequestDTO, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.LEAVE_REQUEST]
  ): Promise<{ request: AttendanceRequest; auditLog: any }> {
    const employee = await this.resolveEmployeeByAuthUser(dto.business_id, dto.authUserId);

    if (!AttendancePolicy.canRequestLeave(permissionCodes)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks permission '${ATTENDANCE_PERMISSIONS.LEAVE_REQUEST}' to submit leave request.`);
    }

    const validTypes = ['SICK', 'PERMISSION', 'ANNUAL_LEAVE', 'EMERGENCY'];
    if (!dto.request_type || !validTypes.includes(dto.request_type)) {
      throw new AttendanceError('INVALID_LEAVE_STATE', `Invalid leave request_type '${dto.request_type}'. Must be one of: SICK, PERMISSION, ANNUAL_LEAVE, EMERGENCY.`);
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dto.start_date || !dateRegex.test(dto.start_date) || isNaN(Date.parse(dto.start_date))) {
      throw new AttendanceError('INVALID_LEAVE_STATE', `Leave start_date '${dto.start_date}' is invalid. Must be in YYYY-MM-DD format.`);
    }

    if (!dto.end_date || !dateRegex.test(dto.end_date) || isNaN(Date.parse(dto.end_date))) {
      throw new AttendanceError('INVALID_LEAVE_STATE', `Leave end_date '${dto.end_date}' is invalid. Must be in YYYY-MM-DD format.`);
    }

    if (new Date(dto.end_date) < new Date(dto.start_date)) {
      throw new AttendanceError('INVALID_LEAVE_STATE', `Leave end_date '${dto.end_date}' cannot be earlier than start_date '${dto.start_date}'.`);
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new AttendanceError('REASON_REQUIRED', 'Reason is required for submitting a leave request.');
    }

    const hasOverlap = await AttendanceRepository.hasOverlappingLeave(
      dto.business_id,
      employee.id,
      dto.start_date,
      dto.end_date
    );

    if (hasOverlap) {
      throw new AttendanceError(
        'LEAVE_DATE_OVERLAP',
        'Tanggal pengajuan cuti berbenturan dengan pengajuan cuti aktif atau yang sudah disetujui.'
      );
    }

    const request = await AttendanceRepository.createLeaveRequest({
      business_id: dto.business_id,
      employee_id: employee.id,
      request_type: dto.request_type,
      start_date: dto.start_date,
      end_date: dto.end_date,
      reason: dto.reason.trim(),
      attachment_path: dto.attachment_path ?? null,
      status: 'SUBMITTED',
    });

    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      'LEAVE_SUBMITTED',
      'attendance_requests',
      dto.authUserId,
      employee.branch_id || undefined,
      request.id,
      {
        employee_id: employee.id,
        request_type: dto.request_type,
        start_date: dto.start_date,
        end_date: dto.end_date,
      }
    );

    // Audit Persistence Architecture
    await AuditLogger.log(auditLog);

    return { request, auditLog };
  }

  static async reviewLeaveRequest(
    dto: ReviewLeaveRequestDTO & { authorizedBranchIds?: string[] }, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.LEAVE_APPROVE],
    clock: Clock = new SystemClock()
  ): Promise<{ request: AttendanceRequest; auditLog: any }> {
    const reviewer = await this.resolveEmployeeByAuthUser(dto.business_id, dto.actorAuthUserId);

    if (!AttendancePolicy.canApproveLeave(permissionCodes, dto.isOwner)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks permission '${ATTENDANCE_PERMISSIONS.LEAVE_APPROVE}' to review leave request.`);
    }

    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!dto.status || !validStatuses.includes(dto.status)) {
      throw new AttendanceError('INVALID_LEAVE_STATE', `Invalid review status '${dto.status}'. Must be 'APPROVED' or 'REJECTED'.`);
    }

    const request = await AttendanceRepository.getLeaveRequestById(dto.requestId);
    if (!request || request.business_id !== dto.business_id) {
      throw new AttendanceError('LEAVE_NOT_FOUND', `Leave request '${dto.requestId}' not found in business tenant '${dto.business_id}'.`);
    }

    if (request.status !== 'SUBMITTED') {
      throw new AttendanceError('DUPLICATE_REQUEST', `Leave request '${dto.requestId}' is already finalized in status '${request.status}'.`);
    }

    // Enforce self-approval prohibition
    AttendancePolicy.enforceNotSelfReview(reviewer.id, request.employee_id);

    // Validate reviewer branch scope against target employee's branch
    const targetEmployee = await PeopleRepository.getEmployeeById(request.employee_id);
    if (targetEmployee && targetEmployee.branch_id) {
      AttendancePolicy.validateBranchAccess(reviewer, targetEmployee.branch_id, dto.authorizedBranchIds, dto.isOwner);
    }

    const rejectionReason = dto.status === 'REJECTED' ? dto.rejection_reason?.trim() : null;

    if (dto.status === 'REJECTED' && (!rejectionReason || rejectionReason === '')) {
      throw new AttendanceError('REASON_REQUIRED', 'Rejection reason is required when rejecting a leave request.');
    }

    // Authoritative Server Clock Abstraction
    const serverNow = clock.now();
    const reviewedAtIso = serverNow.toISOString();

    const auditOperation = dto.status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED';
    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      auditOperation,
      'attendance_requests',
      dto.actorAuthUserId,
      reviewer.branch_id || undefined,
      request.id,
      {
        applicant_employee_id: request.employee_id,
        reviewed_by_employee_id: reviewer.id,
        status: dto.status,
        reviewed_at: reviewedAtIso,
      }
    );

    // Audit Persistence: In mock mode, log via AuditLogger; in production mode, RPC handles atomic DB audit logging
    if (AttendanceRepository.isMockMode()) {
      await AuditLogger.log(auditLog);
    }

    const updatedRequest = await AttendanceRepository.updateLeaveRequestStatus(
      request.id,
      dto.status,
      reviewer.id,
      rejectionReason || undefined,
      reviewedAtIso
    );

    return { request: updatedRequest, auditLog };
  }

  // ============================================================================
  // 5. OVERTIME WORKFLOW
  // ============================================================================

  static async submitOvertimeRequest(
    dto: SubmitOvertimeRequestDTO, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.OVERTIME_REQUEST]
  ): Promise<{ request: OvertimeRequest; auditLog: any }> {
    const employee = await this.resolveEmployeeByAuthUser(dto.business_id, dto.authUserId);

    if (!AttendancePolicy.canRequestOvertime(permissionCodes)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks permission '${ATTENDANCE_PERMISSIONS.OVERTIME_REQUEST}' to submit overtime request.`);
    }

    if (!dto.attendance_record_id) {
      throw new AttendanceError('ATTENDANCE_REQUIRED_FOR_OVERTIME', 'Overtime request requires a valid checked-out attendance record id.');
    }

    const attendance = await AttendanceRepository.getAttendanceById(dto.attendance_record_id);
    if (!attendance || attendance.business_id !== dto.business_id) {
      throw new AttendanceError('ATTENDANCE_NOT_FOUND', `Attendance record '${dto.attendance_record_id}' not found.`);
    }

    if (attendance.employee_id !== employee.id) {
      throw new AttendanceError('UNAUTHORIZED', 'Cannot submit overtime for another employee\'s attendance record.');
    }

    if (attendance.status !== 'CHECKED_OUT') {
      throw new AttendanceError(
        'INVALID_ATTENDANCE_STATE', 
        `Overtime can only be requested for attendance in status 'CHECKED_OUT'. Current status is '${attendance.status}'.`
      );
    }

    if (!dto.claimed_minutes || dto.claimed_minutes <= 0) {
      throw new AttendanceError('INVALID_OVERTIME_MINUTES', `Claimed overtime minutes must be greater than 0. Received: ${dto.claimed_minutes}.`);
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new AttendanceError('REASON_REQUIRED', 'Reason is required for submitting an overtime request.');
    }

    const existingRequests = await AttendanceRepository.listOvertimeRequests(dto.business_id, employee.id);
    const hasActiveOvertime = existingRequests.some(
      r => r.attendance_record_id === attendance.id && (r.status === 'SUBMITTED' || r.status === 'APPROVED')
    );
    if (hasActiveOvertime) {
      throw new AttendanceError(
        'DUPLICATE_REQUEST',
        `An active or approved overtime request already exists for attendance record '${attendance.id}'.`
      );
    }

    const request = await AttendanceRepository.createOvertimeRequest({
      business_id: dto.business_id,
      employee_id: employee.id,
      attendance_record_id: attendance.id,
      overtime_date: attendance.attendance_date,
      claimed_minutes: dto.claimed_minutes,
      approved_minutes: null, // SUBMITTED status MUST have approved_minutes = null
      reason: dto.reason.trim(),
      status: 'SUBMITTED',
    });

    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      'OVERTIME_SUBMITTED',
      'overtime_requests',
      dto.authUserId,
      attendance.branch_id,
      request.id,
      {
        employee_id: employee.id,
        attendance_record_id: attendance.id,
        claimed_minutes: dto.claimed_minutes,
      }
    );

    // Audit Persistence Architecture
    await AuditLogger.log(auditLog);

    return { request, auditLog };
  }

  static async reviewOvertimeRequest(
    dto: ReviewOvertimeRequestDTO, 
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.OVERTIME_APPROVE],
    clock: Clock = new SystemClock()
  ): Promise<{ request: OvertimeRequest; auditLog: any }> {
    const reviewer = await this.resolveEmployeeByAuthUser(dto.business_id, dto.actorAuthUserId);

    if (!AttendancePolicy.canApproveOvertime(permissionCodes, dto.isOwner)) {
      throw new AttendanceError('UNAUTHORIZED', `User lacks permission '${ATTENDANCE_PERMISSIONS.OVERTIME_APPROVE}' to review overtime request.`);
    }

    const request = await AttendanceRepository.getOvertimeRequestById(dto.overtimeId);
    if (!request || request.business_id !== dto.business_id) {
      throw new AttendanceError('OVERTIME_NOT_FOUND', `Overtime request '${dto.overtimeId}' not found in business tenant '${dto.business_id}'.`);
    }

    if (request.status !== 'SUBMITTED') {
      throw new AttendanceError('DUPLICATE_REQUEST', `Cannot review overtime request in status '${request.status}'. Request is already finalized.`);
    }

    // Enforce self-approval prohibition
    AttendancePolicy.enforceNotSelfReview(reviewer.id, request.employee_id);

    // Validate reviewer branch scope against target employee's branch
    const targetEmployee = await PeopleRepository.getEmployeeById(request.employee_id);
    if (targetEmployee && targetEmployee.branch_id) {
      AttendancePolicy.validateBranchAccess(reviewer, targetEmployee.branch_id, dto.authorizedBranchIds, dto.isOwner);
    }

    const rejectionReason = dto.status === 'REJECTED' ? dto.rejection_reason?.trim() : null;

    if (dto.status === 'APPROVED') {
      if (dto.approved_minutes === undefined || dto.approved_minutes === null) {
        throw new AttendanceError(
          'INVALID_OVERTIME_MINUTES', 
          'Approved overtime minutes must be explicitly provided when approving an overtime request.'
        );
      }
      if (dto.approved_minutes <= 0) {
        throw new AttendanceError(
          'INVALID_OVERTIME_MINUTES', 
          `Approved overtime minutes must be greater than 0. Received: ${dto.approved_minutes}.`
        );
      }
      if (dto.approved_minutes > request.claimed_minutes) {
        throw new AttendanceError(
          'INVALID_OVERTIME_MINUTES', 
          `Approved overtime minutes (${dto.approved_minutes}) cannot exceed claimed minutes (${request.claimed_minutes}).`
        );
      }
      if (dto.rejection_reason !== undefined && dto.rejection_reason !== null && dto.rejection_reason.trim() !== '') {
        throw new AttendanceError(
          'INVALID_OVERTIME_STATE',
          'Rejection reason must not be provided when approving an overtime request.'
        );
      }
    } else if (dto.status === 'REJECTED') {
      if (dto.approved_minutes !== undefined && dto.approved_minutes !== null) {
        throw new AttendanceError(
          'INVALID_OVERTIME_STATE',
          'Approved minutes must not be provided when rejecting an overtime request.'
        );
      }
      if (!rejectionReason || rejectionReason === '') {
        throw new AttendanceError(
          'REASON_REQUIRED',
          'Rejection reason is required when rejecting an overtime request.'
        );
      }
    } else {
      throw new AttendanceError(
        'INVALID_OVERTIME_STATE',
        `Invalid review status '${dto.status}'. Must be 'APPROVED' or 'REJECTED'.`
      );
    }

    const serverNow = clock.now();
    const reviewedAtIso = serverNow.toISOString();

    const auditOperation = dto.status === 'APPROVED' ? 'OVERTIME_APPROVED' : 'OVERTIME_REJECTED';
    const auditLog = AuditLogger.buildLogEntry(
      dto.business_id,
      auditOperation,
      'overtime_requests',
      dto.actorAuthUserId,
      (targetEmployee && targetEmployee.branch_id) || reviewer.branch_id || undefined,
      request.id,
      {
        applicant_employee_id: request.employee_id,
        reviewed_by_employee_id: reviewer.id,
        status: dto.status,
        claimed_minutes: request.claimed_minutes,
        approved_minutes: dto.status === 'APPROVED' ? dto.approved_minutes : null,
        rejection_reason: dto.status === 'REJECTED' ? rejectionReason : null,
        reviewed_at: reviewedAtIso,
      }
    );

    // Audit Persistence Architecture: In mock mode, log via AuditLogger; in production mode, RPC handles atomic DB audit logging
    if (AttendanceRepository.isMockMode()) {
      await AuditLogger.log(auditLog);
    }

    const updatedRequest = await AttendanceRepository.updateOvertimeRequestStatus(
      request.id,
      dto.status,
      reviewer.id,
      dto.status === 'APPROVED' ? dto.approved_minutes : null,
      rejectionReason || null,
      reviewedAtIso
    );

    return { request: updatedRequest, auditLog };
  }

  static async listOvertimeRequests(
    dto: ListOvertimeQueryDTO,
    permissionCodes: string[] = [ATTENDANCE_PERMISSIONS.OVERTIME_REQUEST]
  ): Promise<OvertimeListResult> {
    const actorEmployee = await this.resolveEmployeeByAuthUser(dto.business_id, dto.actorAuthUserId);

    const isManager = AttendancePolicy.canApproveOvertime(permissionCodes, dto.isOwner);
    const isSelfService = AttendancePolicy.canRequestOvertime(permissionCodes) || permissionCodes.includes(ATTENDANCE_PERMISSIONS.VIEW);

    if (!isManager && !isSelfService) {
      throw new AttendanceError('UNAUTHORIZED', 'User lacks permission to view overtime requests.');
    }

    let targetEmployeeId: string | undefined = undefined;
    let allowedBranchIds: string[] | undefined = undefined;

    if (isManager) {
      if (dto.isOwner) {
        if (dto.branch_id) {
          allowedBranchIds = [dto.branch_id];
        }
        if (dto.employee_id) {
          targetEmployeeId = dto.employee_id;
        }
      } else {
        const authorized = dto.authorizedBranchIds || [];

        if (dto.branch_id) {
          if (!authorized.includes(dto.branch_id)) {
            throw new AttendanceError(
              'UNAUTHORIZED',
              `Actor employee '${actorEmployee.id}' does not have authorized branch scope for target branch '${dto.branch_id}'.`
            );
          }
          allowedBranchIds = [dto.branch_id];
        } else {
          allowedBranchIds = authorized;
        }

        if (dto.employee_id) {
          const targetEmp = await PeopleRepository.getEmployeeById(dto.employee_id);
          if (!targetEmp || targetEmp.business_id !== dto.business_id) {
            throw new AttendanceError('EMPLOYEE_NOT_FOUND', `Target employee '${dto.employee_id}' not found in active business tenant.`);
          }
          if (targetEmp.branch_id && !authorized.includes(targetEmp.branch_id)) {
            throw new AttendanceError(
              'UNAUTHORIZED',
              `Actor employee '${actorEmployee.id}' does not have authorized branch scope for employee '${dto.employee_id}'.`
            );
          }
          targetEmployeeId = dto.employee_id;
        }
      }
    } else {
      // Ordinary Employee (Self-Service): Strictly force target to own employee ID
      targetEmployeeId = actorEmployee.id;
    }

    return AttendanceRepository.listOvertimeRequestsPaginated({
      business_id: dto.business_id,
      targetEmployeeId,
      allowedBranchIds,
      status: dto.status,
      date_from: dto.date_from,
      date_to: dto.date_to,
      page: dto.page,
      limit: dto.limit,
      sort_by: dto.sort_by,
      sort_order: dto.sort_order,
    });
  }
}
