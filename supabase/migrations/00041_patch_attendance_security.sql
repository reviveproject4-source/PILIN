-- Migration: 00041_patch_attendance_security.sql
-- Description: Patch security & data integrity findings RED-ATT-01, RED-ATT-02, RED-ATT-03

-- ============================================================================
-- 1. RED-ATT-01: OVERTIME CROSS-TENANT & CROSS-EMPLOYEE INTEGRITY TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_verify_overtime_request_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_emp_business UUID;
    v_att_business UUID;
    v_att_employee UUID;
BEGIN
    -- 1. Verify employee belongs to same tenant
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;

    -- 2. If attendance_record_id is provided, verify matching business_id AND employee_id
    IF NEW.attendance_record_id IS NOT NULL THEN
        SELECT business_id, employee_id INTO v_att_business, v_att_employee 
        FROM public.attendance_records 
        WHERE id = NEW.attendance_record_id;

        IF v_att_business IS NULL THEN
            RAISE EXCEPTION 'Attendance record not found';
        END IF;

        IF v_att_business <> NEW.business_id THEN
            RAISE EXCEPTION 'Attendance record does not belong to the same business tenant';
        END IF;

        IF v_att_employee <> NEW.employee_id THEN
            RAISE EXCEPTION 'Attendance record does not belong to the same employee';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS trg_verify_overtime_request_integrity_event ON public.overtime_requests;
CREATE TRIGGER trg_verify_overtime_request_integrity_event
    BEFORE INSERT OR UPDATE ON public.overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_verify_overtime_request_integrity();

-- ============================================================================
-- 2. RED-ATT-02: ATTENDANCE_RECORDS RLS BRANCH SCOPE CORRECTION
-- ============================================================================

DROP POLICY IF EXISTS attendance_records_select_policy ON public.attendance_records;

CREATE POLICY attendance_records_select_policy ON public.attendance_records
    FOR SELECT
    USING (
        business_id = public.auth_current_business_id()
        AND (
            public.auth_is_owner()
            OR public.auth_is_super_admin()
            OR (
                -- Non-owner view requires branch access AND permission (or viewing own record)
                (
                    public.auth_user_has_branch_access(branch_id)
                    OR employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
                )
                AND (
                    public.auth_has_permission('people:attendance:view')
                    OR employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
                )
            )
        )
    );

-- ============================================================================
-- 3. RED-ATT-03: STORAGE SECURITY POLICIES FOR BUCKET 'attendance-selfies'
-- ============================================================================

DROP POLICY IF EXISTS attendance_selfies_select_policy ON storage.objects;
DROP POLICY IF EXISTS attendance_selfies_insert_policy ON storage.objects;

-- SELECT POLICY: Strictly controlled read access based on tenant, employee ownership, and branch scope
CREATE POLICY attendance_selfies_select_policy ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND (
            -- 1. Owner or Super Admin in same tenant
            (
                public.auth_is_owner()
                AND (storage.foldername(name))[1] = ('tenant_' || public.auth_current_business_id()::text)
            )
            OR public.auth_is_super_admin()
            
            -- 2. Employee reading own selfie photo
            OR (
                (storage.foldername(name))[1] = ('tenant_' || public.auth_current_business_id()::text)
                AND (storage.foldername(name))[2] IN (
                    SELECT ('emp_' || id::text) 
                    FROM public.employees 
                    WHERE auth_user_id = auth.uid() 
                      AND business_id = public.auth_current_business_id()
                )
            )

            -- 3. Authorized Manager / KC reading selfie within branch scope
            OR (
                (storage.foldername(name))[1] = ('tenant_' || public.auth_current_business_id()::text)
                AND public.auth_has_permission('people:attendance:view')
                AND (storage.foldername(name))[2] IN (
                    SELECT ('emp_' || e.id::text)
                    FROM public.employees e
                    WHERE e.business_id = public.auth_current_business_id()
                      AND (
                          public.auth_user_has_branch_access(e.branch_id)
                          OR e.branch_id IS NULL
                      )
                )
            )
        )
    );

-- INSERT POLICY: Strictly controlled upload access
CREATE POLICY attendance_selfies_insert_policy ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND (storage.foldername(name))[1] = ('tenant_' || public.auth_current_business_id()::text)
        AND (
            -- 1. Employee uploading own selfie photo
            (
                (storage.foldername(name))[2] IN (
                    SELECT ('emp_' || id::text) 
                    FROM public.employees 
                    WHERE auth_user_id = auth.uid() 
                      AND business_id = public.auth_current_business_id()
                )
            )
            -- 2. Authorized Manager uploading on behalf of employee
            OR (
                (public.auth_has_permission('people:attendance:manage') OR public.auth_is_owner())
                AND (storage.foldername(name))[2] IN (
                    SELECT ('emp_' || e.id::text)
                    FROM public.employees e
                    WHERE e.business_id = public.auth_current_business_id()
                      AND (
                          public.auth_user_has_branch_access(e.branch_id)
                          OR e.branch_id IS NULL
                          OR public.auth_is_owner()
                      )
                )
            )
            OR public.auth_is_super_admin()
        )
    );
