-- 00008_add_platform_super_admin_assignment_table.sql
-- Add a table to store platform‑level role assignments for SUPER_ADMIN.
-- This table does NOT contain permission lists; it only maps a user to a role.

CREATE TABLE IF NOT EXISTS platform_role_assignments (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id    UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)  -- optional, for audit purposes
);

-- Enforce that the role assigned is the SUPER_ADMIN role via trigger (PostgreSQL does not support subqueries in CHECK constraints)
CREATE OR REPLACE FUNCTION verify_platform_role_is_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM roles r WHERE r.id = NEW.role_id AND r.code = 'SUPER_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Platform role assignment must be SUPER_ADMIN';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_platform_role_is_super_admin
BEFORE INSERT OR UPDATE ON platform_role_assignments
FOR EACH ROW EXECUTE FUNCTION verify_platform_role_is_super_admin();

-- Index for quickly locating active assignments.
CREATE INDEX IF NOT EXISTS idx_platform_role_assignments_active ON platform_role_assignments (user_id) WHERE is_active;
