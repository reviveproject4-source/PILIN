-- Migration: 00044_atomic_overtime_review.sql
-- Description: Atomic Overtime Request Review with Database Audit Logging, State Invariants & Concurrency Protection

-- 1. ADD REJECTION_REASON COLUMN TO overtime_requests
ALTER TABLE public.overtime_requests
ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;

-- 2. DATABASE STATE INVARIANT CHECK CONSTRAINT
ALTER TABLE public.overtime_requests
DROP CONSTRAINT IF EXISTS chk_overtime_review_state_invariants;

ALTER TABLE public.overtime_requests
ADD CONSTRAINT chk_overtime_review_state_invariants
CHECK (
  (status = 'SUBMITTED' AND approved_minutes IS NULL AND rejection_reason IS NULL)
  OR
  (status = 'APPROVED'  AND approved_minutes IS NOT NULL AND approved_minutes > 0 AND approved_minutes <= claimed_minutes AND rejection_reason IS NULL)
  OR
  (status = 'REJECTED'  AND approved_minutes IS NULL AND rejection_reason IS NOT NULL AND trim(rejection_reason) <> '')
);

-- 3. DUPLICATE PROTECTION PARTIAL UNIQUE INDEX
CREATE UNIQUE INDEX IF NOT EXISTS idx_overtime_requests_unique_active_att
ON public.overtime_requests(attendance_record_id)
WHERE status IN ('SUBMITTED', 'APPROVED');

-- 4. DATABASE-NATIVE ATOMIC OVERTIME REVIEW RPC FUNCTION
CREATE OR REPLACE FUNCTION public.review_overtime_request_atomic(
  p_overtime_id UUID,
  p_status TEXT,
  p_approved_minutes INTEGER DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_auth_user_id UUID;
  v_reviewer public.employees%ROWTYPE;
  v_applicant public.employees%ROWTYPE;
  v_request public.overtime_requests%ROWTYPE;
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

  -- 3. PERMISSION CHECK (people:overtime:approve OR OWNER)
  IF NOT (public.auth_has_permission('people:overtime:approve') OR public.auth_is_owner()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Lacks permission people:overtime:approve to review overtime requests.';
  END IF;

  -- 4. VALIDATE INPUT STATUS ENUM
  IF p_status IS NULL OR p_status NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'INVALID_OVERTIME_STATE: Invalid review status. Must be APPROVED or REJECTED.';
  END IF;

  -- 5. FETCH & ISOLATE TARGET OVERTIME REQUEST
  SELECT * INTO v_request
  FROM public.overtime_requests
  WHERE id = p_overtime_id
    AND business_id = v_tenant_id;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'OVERTIME_NOT_FOUND: Overtime request not found in active business tenant.';
  END IF;

  -- 6. STATE MACHINE CHECK (MUST BE SUBMITTED)
  IF v_request.status != 'SUBMITTED' THEN
    RAISE EXCEPTION 'DUPLICATE_REQUEST: Overtime request is already finalized in status %.', v_request.status;
  END IF;

  -- 7. ENFORCE SELF-APPROVAL PROHIBITION
  IF v_reviewer.id = v_request.employee_id THEN
    RAISE EXCEPTION 'SELF_APPROVAL_NOT_ALLOWED: Employees are prohibited from approving their own overtime requests.';
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

  -- 9. STATUS-SPECIFIC PARAMETER VALIDATION (STRICT INVARIANTS)
  v_clean_reason := trim(p_rejection_reason);

  IF p_status = 'APPROVED' THEN
    IF p_approved_minutes IS NULL OR p_approved_minutes <= 0 THEN
      RAISE EXCEPTION 'INVALID_OVERTIME_MINUTES: Approved overtime minutes must be explicitly provided and greater than 0.';
    END IF;
    IF p_approved_minutes > v_request.claimed_minutes THEN
      RAISE EXCEPTION 'INVALID_OVERTIME_MINUTES: Approved overtime minutes (%) cannot exceed claimed minutes (%).', p_approved_minutes, v_request.claimed_minutes;
    END IF;
    IF v_clean_reason IS NOT NULL AND v_clean_reason <> '' THEN
      RAISE EXCEPTION 'INVALID_OVERTIME_STATE: Rejection reason must not be provided when approving an overtime request.';
    END IF;
  ELSIF p_status = 'REJECTED' THEN
    IF p_approved_minutes IS NOT NULL THEN
      RAISE EXCEPTION 'INVALID_OVERTIME_STATE: Approved minutes must not be provided when rejecting an overtime request.';
    END IF;
    IF v_clean_reason IS NULL OR v_clean_reason = '' THEN
      RAISE EXCEPTION 'REASON_REQUIRED: Rejection reason is required when rejecting an overtime request.';
    END IF;
  END IF;

  -- 10. SERVER TIMESTAMP AUTHORITY
  v_timestamp := NOW();

  -- 11. OPTIMISTIC CONCURRENCY MUTATION
  UPDATE public.overtime_requests
  SET 
    status = p_status,
    approved_minutes = CASE WHEN p_status = 'APPROVED' THEN p_approved_minutes ELSE NULL END,
    rejection_reason = CASE WHEN p_status = 'REJECTED' THEN v_clean_reason ELSE NULL END,
    reviewed_by_employee_id = v_reviewer.id,
    reviewed_at = v_timestamp,
    updated_at = v_timestamp
  WHERE id = p_overtime_id
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
    v_applicant.branch_id,
    v_auth_user_id,
    CASE WHEN p_status = 'APPROVED' THEN 'OVERTIME_APPROVED' ELSE 'OVERTIME_REJECTED' END,
    'overtime_requests',
    v_request.id,
    jsonb_build_object(
      'applicant_employee_id', v_request.employee_id,
      'reviewed_by_employee_id', v_reviewer.id,
      'status', p_status,
      'claimed_minutes', v_request.claimed_minutes,
      'approved_minutes', v_request.approved_minutes,
      'rejection_reason', v_request.rejection_reason,
      'reviewed_at', v_timestamp
    )
  );

  RETURN to_jsonb(v_request);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- GRANT EXECUTE EXCLUSIVELY TO AUTHENTICATED USERS
REVOKE EXECUTE ON FUNCTION public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_overtime_request_atomic(UUID, TEXT, INTEGER, TEXT) TO authenticated;
