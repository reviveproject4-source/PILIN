-- Migration: 00040_people_attendance_foundation.sql
-- Description: People V2 Attendance Foundation (attendance_records, attendance_requests, overtime_requests, storage bucket & RLS policies)

-- ============================================================================
-- 1. TABLE: attendance_records (Single Daily Attendance Record)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_in_photo_path TEXT NOT NULL,
    check_in_lat NUMERIC(10,7) NULL,
    check_in_lng NUMERIC(10,7) NULL,
    check_in_accuracy NUMERIC(6,2) NULL,
    check_in_location_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    check_out_time TIMESTAMPTZ NULL,
    check_out_photo_path TEXT NULL,
    check_out_lat NUMERIC(10,7) NULL,
    check_out_lng NUMERIC(10,7) NULL,
    check_out_accuracy NUMERIC(6,2) NULL,
    check_out_location_status VARCHAR(20) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'CHECKED_IN',
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique Constraint: 1 active record per employee per business date
    CONSTRAINT uq_attendance_emp_date UNIQUE (business_id, employee_id, attendance_date),

    -- Status validation
    CONSTRAINT chk_attendance_status CHECK (status IN ('CHECKED_IN', 'CHECKED_OUT', 'AUTO_CLOSED')),
    CONSTRAINT chk_check_in_location_status CHECK (check_in_location_status IN ('AVAILABLE', 'DENIED', 'UNAVAILABLE', 'INACCURATE', 'MANUAL_ENTRY')),
    CONSTRAINT chk_check_out_location_status CHECK (check_out_location_status IS NULL OR check_out_location_status IN ('AVAILABLE', 'DENIED', 'UNAVAILABLE', 'INACCURATE', 'MANUAL_ENTRY')),
    CONSTRAINT chk_check_out_after_check_in CHECK (check_out_time IS NULL OR check_out_time >= check_in_time)
);

-- ============================================================================
-- 2. TABLE: attendance_requests (Ijin / Sakit / Cuti / Emergency Workflow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    request_type VARCHAR(30) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    attachment_path TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by_employee_id UUID NULL REFERENCES public.employees(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    rejection_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Status & Type Validation
    CONSTRAINT chk_request_type CHECK (request_type IN ('SICK', 'PERMISSION', 'ANNUAL_LEAVE', 'EMERGENCY')),
    CONSTRAINT chk_request_status CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    CONSTRAINT chk_request_dates CHECK (end_date >= start_date),
    CONSTRAINT chk_request_not_self_review CHECK (reviewed_by_employee_id IS NULL OR reviewed_by_employee_id <> employee_id)
);

-- ============================================================================
-- 3. TABLE: overtime_requests (Approved Overtime Workflow)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.overtime_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    attendance_record_id UUID NULL REFERENCES public.attendance_records(id) ON DELETE SET NULL,
    overtime_date DATE NOT NULL,
    claimed_minutes INTEGER NOT NULL,
    approved_minutes INTEGER NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    reviewed_by_employee_id UUID NULL REFERENCES public.employees(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Status & Value Validation
    CONSTRAINT chk_overtime_status CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED')),
    CONSTRAINT chk_overtime_claimed_gt_zero CHECK (claimed_minutes > 0),
    CONSTRAINT chk_overtime_approved_non_neg CHECK (approved_minutes IS NULL OR approved_minutes >= 0),
    CONSTRAINT chk_overtime_not_self_review CHECK (reviewed_by_employee_id IS NULL OR reviewed_by_employee_id <> employee_id)
);

-- ============================================================================
-- 4. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_attendance_records_business_date ON public.attendance_records(business_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_employee_date ON public.attendance_records(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_branch_id ON public.attendance_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_status ON public.attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_attendance_requests_business_id ON public.attendance_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_employee_id ON public.attendance_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_requests_status ON public.attendance_requests(status);

CREATE INDEX IF NOT EXISTS idx_overtime_requests_business_id ON public.overtime_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_employee_id ON public.overtime_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_overtime_requests_attendance_rec ON public.overtime_requests(attendance_record_id);

-- ============================================================================
-- 5. CROSS-TENANT INTEGRITY TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_verify_attendance_record_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_emp_business UUID;
    v_branch_business UUID;
BEGIN
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;

    SELECT business_id INTO v_branch_business FROM public.branches WHERE id = NEW.branch_id;
    IF v_branch_business IS NULL OR v_branch_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Branch does not belong to the same business tenant';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_verify_attendance_record_integrity_event ON public.attendance_records;
CREATE TRIGGER trg_verify_attendance_record_integrity_event
    BEFORE INSERT OR UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_verify_attendance_record_integrity();

CREATE OR REPLACE FUNCTION public.trg_verify_attendance_request_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_emp_business UUID;
BEGIN
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_verify_attendance_request_integrity_event ON public.attendance_requests;
CREATE TRIGGER trg_verify_attendance_request_integrity_event
    BEFORE INSERT OR UPDATE ON public.attendance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_verify_attendance_request_integrity();

CREATE OR REPLACE FUNCTION public.trg_verify_overtime_request_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_emp_business UUID;
BEGIN
    SELECT business_id INTO v_emp_business FROM public.employees WHERE id = NEW.employee_id;
    IF v_emp_business IS NULL OR v_emp_business <> NEW.business_id THEN
        RAISE EXCEPTION 'Employee does not belong to the same business tenant';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_verify_overtime_request_integrity_event ON public.overtime_requests;
CREATE TRIGGER trg_verify_overtime_request_integrity_event
    BEFORE INSERT OR UPDATE ON public.overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_verify_overtime_request_integrity();

-- ============================================================================
-- 6. UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_attendance_requests_updated_at ON public.attendance_requests;
CREATE TRIGGER trg_attendance_requests_updated_at
    BEFORE UPDATE ON public.attendance_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_overtime_requests_updated_at ON public.overtime_requests;
CREATE TRIGGER trg_overtime_requests_updated_at
    BEFORE UPDATE ON public.overtime_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. SEED ATTENDANCE PERMISSIONS & ROLE MAPPINGS
-- ============================================================================

INSERT INTO public.permissions (id, code, domain, description)
VALUES 
    (gen_random_uuid(), 'people:attendance:view', 'people', 'View attendance records and reports'),
    (gen_random_uuid(), 'people:attendance:record', 'people', 'Clock-in and clock-out self service'),
    (gen_random_uuid(), 'people:attendance:manage', 'people', 'Managerial attendance entry and override'),
    (gen_random_uuid(), 'people:leave:request', 'people', 'Submit leave and permission requests'),
    (gen_random_uuid(), 'people:leave:approve', 'people', 'Review and approve/reject leave requests'),
    (gen_random_uuid(), 'people:overtime:request', 'people', 'Submit overtime requests'),
    (gen_random_uuid(), 'people:overtime:approve', 'people', 'Review and approve/reject overtime requests')
ON CONFLICT (code) DO NOTHING;

-- Map to Roles
-- Owner ('11111111-1111-1111-1111-111111111111') -> All permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id
FROM public.permissions
WHERE code IN (
    'people:attendance:view', 'people:attendance:record', 'people:attendance:manage',
    'people:leave:request', 'people:leave:approve',
    'people:overtime:request', 'people:overtime:approve'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Kepala Cabang ('22222222-2222-2222-2222-222222222222') -> All permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id
FROM public.permissions
WHERE code IN (
    'people:attendance:view', 'people:attendance:record', 'people:attendance:manage',
    'people:leave:request', 'people:leave:approve',
    'people:overtime:request', 'people:overtime:approve'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Pegawai ('33333333-3333-3333-3333-333333333333') -> Self-service only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id
FROM public.permissions
WHERE code IN (
    'people:attendance:view', 'people:attendance:record',
    'people:leave:request', 'people:overtime:request'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_requests ENABLE ROW LEVEL SECURITY;

-- 8.1 ATTENDANCE_RECORDS RLS
CREATE POLICY attendance_records_select_policy ON public.attendance_records
    FOR SELECT
    USING (
        business_id = public.auth_current_business_id()
        AND (
            public.auth_is_owner()
            OR public.auth_is_super_admin()
            OR public.auth_user_has_branch_access(branch_id)
            OR employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:attendance:view')
        )
    );

CREATE POLICY attendance_records_insert_policy ON public.attendance_records
    FOR INSERT
    WITH CHECK (
        business_id = public.auth_current_business_id()
        AND (
            employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:attendance:manage')
            OR public.auth_is_owner()
            OR public.auth_is_super_admin()
        )
    );

CREATE POLICY attendance_records_update_policy ON public.attendance_records
    FOR UPDATE
    USING (
        business_id = public.auth_current_business_id()
        AND (
            employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:attendance:manage')
            OR public.auth_is_owner()
            OR public.auth_is_super_admin()
        )
    );

-- 8.2 ATTENDANCE_REQUESTS RLS
CREATE POLICY attendance_requests_select_policy ON public.attendance_requests
    FOR SELECT
    USING (
        business_id = public.auth_current_business_id()
        AND (
            public.auth_is_owner()
            OR public.auth_is_super_admin()
            OR employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:leave:approve')
            OR public.auth_has_permission('people:attendance:view')
        )
    );

CREATE POLICY attendance_requests_insert_policy ON public.attendance_requests
    FOR INSERT
    WITH CHECK (
        business_id = public.auth_current_business_id()
        AND (
            employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:leave:request')
            OR public.auth_is_owner()
            OR public.auth_is_super_admin()
        )
    );

CREATE POLICY attendance_requests_update_policy ON public.attendance_requests
    FOR UPDATE
    USING (
        business_id = public.auth_current_business_id()
        AND (
            (employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) AND status = 'SUBMITTED')
            OR public.auth_has_permission('people:leave:approve')
            OR public.auth_is_owner()
            OR public.auth_is_super_admin()
        )
    );

-- 8.3 OVERTIME_REQUESTS RLS
CREATE POLICY overtime_requests_select_policy ON public.overtime_requests
    FOR SELECT
    USING (
        business_id = public.auth_current_business_id()
        AND (
            public.auth_is_owner()
            OR public.auth_is_super_admin()
            OR employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:overtime:approve')
            OR public.auth_has_permission('people:attendance:view')
        )
    );

CREATE POLICY overtime_requests_insert_policy ON public.overtime_requests
    FOR INSERT
    WITH CHECK (
        business_id = public.auth_current_business_id()
        AND (
            employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid())
            OR public.auth_has_permission('people:overtime:request')
            OR public.auth_is_owner()
            OR public.auth_is_super_admin()
        )
    );

CREATE POLICY overtime_requests_update_policy ON public.overtime_requests
    FOR UPDATE
    USING (
        business_id = public.auth_current_business_id()
        AND (
            (employee_id IN (SELECT id FROM public.employees WHERE auth_user_id = auth.uid()) AND status = 'SUBMITTED')
            OR public.auth_has_permission('people:overtime:approve')
            OR public.auth_is_owner()
            OR public.auth_is_super_admin()
        )
    );

-- ============================================================================
-- 9. PRIVATE STORAGE BUCKET & RLS POLICIES FOR ATTENDANCE SELFIES
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attendance-selfies',
    'attendance-selfies',
    false,
    2097152, -- 2MB Limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS Policies
DROP POLICY IF EXISTS attendance_selfies_select_policy ON storage.objects;
CREATE POLICY attendance_selfies_select_policy ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND (
            auth.role() = 'authenticated'
        )
    );

DROP POLICY IF EXISTS attendance_selfies_insert_policy ON storage.objects;
CREATE POLICY attendance_selfies_insert_policy ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND auth.role() = 'authenticated'
    );
