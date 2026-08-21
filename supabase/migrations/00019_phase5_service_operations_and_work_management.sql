-- Migration: 00019_phase5_service_operations_and_work_management.sql
-- Description: Phase 5 Service Operations & Work Management Core Entities, SLA, Quality Control, Deliveries, Outbox, and RLS

-- 1. BUSINESS CALENDAR & SLA
CREATE TABLE IF NOT EXISTS business_calendar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_branch_calendar UNIQUE (business_id, branch_id)
);

CREATE TABLE IF NOT EXISTS business_calendar_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES business_calendar(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_working_day BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_calendar_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES business_calendar(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT TRUE,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SERVICE ORDERS & AGGREGATES
CREATE TABLE IF NOT EXISTS service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    order_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'RECEIVED' CHECK (status IN (
        'RECEIVED', 'DIAGNOSIS', 'ESTIMATE', 'WAITING_APPROVAL', 'APPROVED', 
        'IN_PROGRESS', 'ON_HOLD', 'QC', 'READY_FOR_PICKUP', 'DELIVERED', 'CLOSED', 'REJECTED', 'CANCELLED'
    )),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    notes TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    target_completion_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_tenant_order_number UNIQUE (business_id, order_number)
);

CREATE TABLE IF NOT EXISTS service_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    service_name_snapshot VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    estimated_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    approved_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_order_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    asset_type VARCHAR(100) NOT NULL, -- e.g., 'SHOES', 'BAG', 'WATCH'
    brand VARCHAR(100),
    model VARCHAR(100),
    color VARCHAR(50),
    serial_number VARCHAR(100),
    condition_notes TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW(),
    returned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_order_estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'PRESENTED', 'APPROVED', 'REJECTED', 'SUPERSEDED', 'CANCELLED'
    )),
    total_estimated_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_approved_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    CONSTRAINT uq_so_estimate_version UNIQUE (service_order_id, version)
);

-- 3. JOBS & EXECUTION AGGREGATES
CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'QUEUED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'READY_FOR_QC', 'QC', 'COMPLETED', 'REWORK'
    )),
    priority VARCHAR(20) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    estimated_duration_minutes INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    depends_on_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_job_dependency UNIQUE (job_id, depends_on_job_id),
    CONSTRAINT chk_no_self_dependency CHECK (job_id <> depends_on_job_id)
);

CREATE TABLE IF NOT EXISTS job_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'REASSIGNED', 'RELEASED')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS job_material_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    material_name_snapshot VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit VARCHAR(50) DEFAULT 'PCS',
    unit_cost_snapshot NUMERIC(15,2) DEFAULT 0.00,
    recorded_by UUID REFERENCES auth.users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_sla (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sla_status VARCHAR(50) DEFAULT 'ON_TRACK' CHECK (sla_status IN (
        'ON_TRACK', 'AT_RISK', 'BREACHED', 'COMPLETED_ON_TIME', 'COMPLETED_LATE'
    )),
    elapsed_business_minutes INT DEFAULT 0,
    target_business_minutes INT DEFAULT 120,
    hold_reason VARCHAR(100),
    pauses_sla BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_job_sla UNIQUE (job_id)
);

CREATE TABLE IF NOT EXISTS job_qc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    inspector_user_id UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(50) NOT NULL CHECK (status IN ('PASSED', 'FAILED')),
    pass_notes TEXT,
    fail_notes TEXT,
    inspected_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DELIVERIES
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    delivery_type VARCHAR(50) NOT NULL CHECK (delivery_type IN ('CUSTOMER_PICKUP', 'DELIVERY')),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'READY' CHECK (status IN ('READY', 'DELIVERED', 'CANCELLED')),
    delivered_at TIMESTAMPTZ,
    handled_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. LINK TRANSACTIONS TO SERVICE ORDERS (NULLABLE)
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL;

-- 6. HARD DELETE PROTECTION TRIGGER FOR PHASE 5
CREATE OR REPLACE FUNCTION prevent_hard_delete_phase5()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PHYSICAL DELETE PROHIBITED BY MINARA BOS PHASE 5 POLICY. USE STATUS TRANSITIONS INSTEAD.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_service_orders ON service_orders;
CREATE TRIGGER trg_no_delete_service_orders BEFORE DELETE ON service_orders FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase5();

DROP TRIGGER IF EXISTS trg_no_delete_jobs ON jobs;
CREATE TRIGGER trg_no_delete_jobs BEFORE DELETE ON jobs FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase5();

DROP TRIGGER IF EXISTS trg_no_delete_deliveries ON deliveries;
CREATE TRIGGER trg_no_delete_deliveries BEFORE DELETE ON deliveries FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase5();

-- 7. ENABLE ROW LEVEL SECURITY (RLS) ON ALL PHASE 5 TABLES
ALTER TABLE business_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_order_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_sla ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_qc ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

-- 8. CREATE RLS POLICIES FOR PHASE 5 TABLES

-- SERVICE ORDERS POLICIES
CREATE POLICY rls_service_orders_tenant_isolation ON service_orders
    FOR ALL USING (business_id = auth_current_business_id());

CREATE POLICY rls_service_orders_branch_scope ON service_orders
    FOR ALL USING (auth_is_owner() OR auth_user_has_branch_access(branch_id));

-- JOBS POLICIES
CREATE POLICY rls_jobs_tenant_isolation ON jobs
    FOR ALL USING (business_id = auth_current_business_id());

CREATE POLICY rls_jobs_branch_scope ON jobs
    FOR ALL USING (auth_is_owner() OR auth_user_has_branch_access(branch_id));

-- DELIVERIES POLICIES
CREATE POLICY rls_deliveries_tenant_isolation ON deliveries
    FOR ALL USING (business_id = auth_current_business_id());

CREATE POLICY rls_deliveries_branch_scope ON deliveries
    FOR ALL USING (auth_is_owner() OR auth_user_has_branch_access(branch_id));
