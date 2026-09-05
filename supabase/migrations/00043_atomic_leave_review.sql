-- Migration: 00043_atomic_leave_review.sql
-- Description: Atomic Leave Request Review with Database Audit Logging & Concurrency Control

CREATE OR REPLACE FUNCTION public.review_leave_request_atomic(
  p_request_id UUID,
  p_status TEXT,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_auth_user_id UUID;
  v_reviewer public.employees%ROWTYPE;
  v_applicant public.employees%ROWTYPE;
  v_request public.attendance_requests%ROWTYPE;
  v_timestamp TIMESTAMPTZ;
  v_clean_reason TEXT;
BEGIN
  -- 1. SERVER-SIDE AUTHENTICATION & TENANT RESOLUTION
  v_auth_user_id := auth.uid();
  v_tenant_id := public.auth_current_business_id();

  IF v_auth_user_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Valid authentication session and active tenant context required.';
  END IF;

  -- 2. RESOLVE REVIEWER IDENTITY FROM auth.uid() (NO CLIENT TRUST)
  SELECT * INTO v_reviewer
  FROM public.employees
  WHERE business_id = v_tenant_id
    AND auth_user_id = v_auth_user_id;

  IF v_reviewer.id IS NULL THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND: No employee profile linked to current authenticated user.';
  END IF;

  IF v_reviewer.employment_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'EMPLOYEE_INACTIVE: Reviewer employee profile is INACTIVE or RESIGNED.';
  END IF;

  -- 3. PERMISSION CHECK (people:leave:approve OR OWNER)
  IF NOT (public.auth_has_permission('people:leave:approve') OR public.auth_is_owner()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Lacks permission people:leave:approve to review leave requests.';
  END IF;

  -- 4. VALIDATE INPUT STATUS ENUM
  IF p_status IS NULL OR p_status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'INVALID_LEAVE_STATE: Invalid review status. Must be APPROVED or REJECTED.';
  END IF;

  -- 5. FETCH & ISOLATE TARGET LEAVE REQUEST
  SELECT * INTO v_request
  FROM public.attendance_requests
  WHERE id = p_request_id
    AND business_id = v_tenant_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'LEAVE_NOT_FOUND: Leave request not found in active business tenant.';
  END IF;

  -- 6. STATE MACHINE CHECK (MUST BE SUBMITTED)
  IF v_request.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'DUPLICATE_REQUEST: Leave request is already finalized in status %.', v_request.status;
  END IF;

  -- 7. ENFORCE SELF-APPROVAL PROHIBITION
  IF v_reviewer.id = v_request.employee_id THEN
    RAISE EXCEPTION 'SELF_APPROVAL_NOT_ALLOWED: Employees are prohibited from approving their own leave requests.';
  END IF;

  -- 8. TENANT-BOUND APPLICANT LOOKUP & BRANCH SCOPE CHECK
  SELECT * INTO v_applicant
  FROM public.employees
  WHERE id = v_request.employee_id
    AND business_id = v_tenant_id;

  IF v_applicant.id IS NULL THEN
    RAISE EXCEPTION 'EMPLOYEE_NOT_FOUND: Target applicant employee not found in active tenant.';
  END IF;

  IF v_applicant.branch_id IS NOT NULL THEN
    IF NOT public.auth_user_has_branch_access(v_applicant.branch_id) THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Reviewer lacks authorized branch scope for target employee branch.';
    END IF;
  END IF;

  -- 9. REJECTION REASON SANITIZATION & VALIDATION
  v_clean_reason := trim(p_rejection_reason);
  IF p_status = 'REJECTED' AND (v_clean_reason IS NULL OR v_clean_reason = '') THEN
    RAISE EXCEPTION 'REASON_REQUIRED: Rejection reason is required when rejecting a leave request.';
  END IF;

  -- 10. SERVER TIMESTAMP AUTHORITY
  v_timestamp := NOW();

  -- 11. OPTIMISTIC CONCURRENCY MUTATION
  UPDATE public.attendance_requests
  SET 
    status = p_status,
    reviewed_by_employee_id = v_reviewer.id,
    reviewed_at = v_timestamp,
    rejection_reason = CASE WHEN p_status = 'REJECTED' THEN v_clean_reason ELSE NULL END,
    updated_at = v_timestamp
  WHERE id = p_request_id
    AND business_id = v_tenant_id
    AND status = 'SUBMITTED'
  RETURNING * INTO v_request;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'DUPLICATE_REQUEST: Concurrent modification detected. Request already finalized.';
  END IF;

  -- 12. ATOMIC AUDIT LOG INSERTION (SAME POSTGRES TRANSACTION BLOCK)
  INSERT INTO public.audit_logs (
    business_id,
    branch_id,
    actor_user_id,
    operation,
    entity,
    entity_id,
    payload_sanitized
  ) VALUES (
    v_request.business_id,
    v_request.branch_id,
    v_auth_user_id,
    CASE WHEN p_status = 'APPROVED' THEN 'LEAVE_APPROVED' ELSE 'LEAVE_REJECTED' END,
    'attendance_requests',
    v_request.id,
    jsonb_build_object(
      'applicant_employee_id', v_request.employee_id,
      'reviewed_by_employee_id', v_reviewer.id,
      'status', p_status,
      'reviewed_at', v_timestamp
    )
  );

  RETURN to_jsonb(v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- GRANT EXECUTE EXCLUSIVELY TO AUTHENTICATED USERS
GRANT EXECUTE ON FUNCTION public.review_leave_request_atomic(UUID, TEXT, TEXT) TO authenticated;
