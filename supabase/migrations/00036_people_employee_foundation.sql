-- Migration: 00036_people_employee_foundation.sql
-- Description: Employee Foundation / People Domain Schema, Rules, Indexes, Permissions, and RLS Policies

-- 1. DIVISIONS TABLE
CREATE TABLE IF NOT EXISTS divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_division_business_code UNIQUE (business_id, code)
);

-- 2. POSITIONS TABLE
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES divisions(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    level VARCHAR(50) NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_position_business_code UNIQUE (business_id, code)
);

-- 3. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    employee_code VARCHAR(50) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(255) NULL,
    photo_url TEXT NULL,
    birth_date DATE NULL,
    address TEXT NULL,
    join_date DATE NULL,
    employment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (employment_status IN ('ACTIVE', 'INACTIVE', 'RESIGNED')),
    branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
    division_id UUID NULL REFERENCES divisions(id) ON DELETE SET NULL,
    position_id UUID NULL REFERENCES positions(id) ON DELETE SET NULL,
    supervisor_id UUID NULL REFERENCES employees(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_employee_business_code UNIQUE (business_id, employee_code),
    CONSTRAINT uq_employee_business_auth_user UNIQUE (business_id, auth_user_id),
    CONSTRAINT chk_employee_supervisor_not_self CHECK (supervisor_id IS NULL OR supervisor_id <> id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_divisions_business_id ON divisions(business_id);
CREATE INDEX IF NOT EXISTS idx_divisions_code ON divisions(business_id, code);

CREATE INDEX IF NOT EXISTS idx_positions_business_id ON positions(business_id);
CREATE INDEX IF NOT EXISTS idx_positions_division_id ON positions(division_id);
CREATE INDEX IF NOT EXISTS idx_positions_code ON positions(business_id, code);

CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_division_id ON employees(division_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_supervisor_id ON employees(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_employees_auth_user_id ON employees(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(business_id, employment_status);

-- UPDATED_AT TRIGGERS
DROP TRIGGER IF EXISTS trg_divisions_updated_at ON divisions;
CREATE TRIGGER trg_divisions_updated_at BEFORE UPDATE ON divisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_positions_updated_at ON positions;
CREATE TRIGGER trg_positions_updated_at BEFORE UPDATE ON positions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HARD DELETE PROTECTION
CREATE OR REPLACE FUNCTION prevent_hard_delete_people()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PHYSICAL DELETE PROHIBITED ON PEOPLE DOMAIN (%). USE EMPLOYMENT STATUS TRANSITION OR IS_ACTIVE = FALSE INSTEAD.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_divisions ON divisions;
CREATE TRIGGER trg_no_delete_divisions BEFORE DELETE ON divisions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_people();

DROP TRIGGER IF EXISTS trg_no_delete_positions ON positions;
CREATE TRIGGER trg_no_delete_positions BEFORE DELETE ON positions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_people();

DROP TRIGGER IF EXISTS trg_no_delete_employees ON employees;
CREATE TRIGGER trg_no_delete_employees BEFORE DELETE ON employees FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_people();

-- BUSINESS RULES INTEGRITY TRIGGER (POSITION-DIVISION & SUPERVISOR INTEGRITY)
CREATE OR REPLACE FUNCTION trg_verify_employee_integrity()
RETURNS TRIGGER AS $$
DECLARE
    v_pos_division_id UUID;
    v_pos_business_id UUID;
    v_div_business_id UUID;
    v_branch_business_id UUID;
    v_sup_business_id UUID;
    v_sup_status VARCHAR(50);
    v_sup_active BOOLEAN;
BEGIN
    -- 1. Position & Division consistency
    IF NEW.position_id IS NOT NULL THEN
        SELECT division_id, business_id INTO v_pos_division_id, v_pos_business_id FROM positions WHERE id = NEW.position_id;
        IF v_pos_business_id IS NULL OR v_pos_business_id <> NEW.business_id THEN
            RAISE EXCEPTION 'Position does not belong to the same business tenant';
        END IF;
        IF NEW.division_id IS NOT NULL AND NEW.division_id <> v_pos_division_id THEN
            RAISE EXCEPTION 'Employee division_id (%) is inconsistent with position division_id (%)', NEW.division_id, v_pos_division_id;
        END IF;
        -- Auto-set division_id if missing
        IF NEW.division_id IS NULL THEN
            NEW.division_id := v_pos_division_id;
        END IF;
    END IF;

    -- 2. Division tenant check
    IF NEW.division_id IS NOT NULL THEN
        SELECT business_id INTO v_div_business_id FROM divisions WHERE id = NEW.division_id;
        IF v_div_business_id IS NULL OR v_div_business_id <> NEW.business_id THEN
            RAISE EXCEPTION 'Division does not belong to the same business tenant';
        END IF;
    END IF;

    -- 3. Branch tenant check
    IF NEW.branch_id IS NOT NULL THEN
        SELECT business_id INTO v_branch_business_id FROM branches WHERE id = NEW.branch_id;
        IF v_branch_business_id IS NULL OR v_branch_business_id <> NEW.business_id THEN
            RAISE EXCEPTION 'Branch does not belong to the same business tenant';
        END IF;
    END IF;

    -- 4. Supervisor validation
    IF NEW.supervisor_id IS NOT NULL THEN
        IF NEW.supervisor_id = NEW.id THEN
            RAISE EXCEPTION 'Employee cannot be their own supervisor';
        END IF;
        SELECT business_id, employment_status, is_active INTO v_sup_business_id, v_sup_status, v_sup_active FROM employees WHERE id = NEW.supervisor_id;
        IF v_sup_business_id IS NULL OR v_sup_business_id <> NEW.business_id THEN
            RAISE EXCEPTION 'Supervisor must belong to the same business tenant';
        END IF;
        IF v_sup_status <> 'ACTIVE' OR v_sup_active = FALSE THEN
            RAISE EXCEPTION 'Supervisor must be an ACTIVE employee';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employee_integrity ON employees;
CREATE TRIGGER trg_employee_integrity
BEFORE INSERT OR UPDATE ON employees
FOR EACH ROW EXECUTE FUNCTION trg_verify_employee_integrity();

-- SEED PERMISSIONS FOR PEOPLE DOMAIN
INSERT INTO permissions (code, domain, description) VALUES
('people:employee:view', 'people', 'Lihat data pegawai & struktur organisasi'),
('people:employee:create', 'people', 'Tambah data pegawai baru'),
('people:employee:update', 'people', 'Edit & update data pegawai'),
('people:employee:manage', 'people', 'Akses kelola penuh organisasi pegawai')
ON CONFLICT (code) DO NOTHING;

-- MAP PERMISSIONS TO EXISTING ROLES
-- Owner gets all people permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM permissions WHERE domain = 'people'
ON CONFLICT DO NOTHING;

-- Kepala Cabang gets view, create, update
INSERT INTO role_permissions (role_id, permission_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM permissions 
WHERE code IN ('people:employee:view', 'people:employee:create', 'people:employee:update')
ON CONFLICT DO NOTHING;

-- Pegawai gets view permission
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM permissions 
WHERE code IN ('people:employee:view')
ON CONFLICT DO NOTHING;

-- ENABLE RLS
ALTER TABLE divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR DIVISIONS
CREATE POLICY divisions_select_policy ON divisions
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id() OR auth_is_super_admin());

CREATE POLICY divisions_manage_policy ON divisions
  FOR ALL TO authenticated
  USING ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin())
  WITH CHECK ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin());

-- POLICIES FOR POSITIONS
CREATE POLICY positions_select_policy ON positions
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id() OR auth_is_super_admin());

CREATE POLICY positions_manage_policy ON positions
  FOR ALL TO authenticated
  USING ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin())
  WITH CHECK ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin());

-- POLICIES FOR EMPLOYEES
CREATE POLICY employees_select_policy ON employees
  FOR SELECT TO authenticated
  USING ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_user_has_branch_access(branch_id) OR branch_id IS NULL)) OR auth_is_super_admin());

CREATE POLICY employees_insert_policy ON employees
  FOR INSERT TO authenticated
  WITH CHECK ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:create') OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin());

CREATE POLICY employees_update_policy ON employees
  FOR UPDATE TO authenticated
  USING ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:update') OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin())
  WITH CHECK ((business_id = auth_current_business_id() AND (auth_is_owner() OR auth_has_permission('people:employee:update') OR auth_has_permission('people:employee:manage') OR auth_has_permission('org:employee:manage'))) OR auth_is_super_admin());
