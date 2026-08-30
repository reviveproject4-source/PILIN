-- Migration 00038: Super Admin Security and Platform Role Assignments Triggers
-- Enforces self-demotion guards, orphan super admin block, mutability blocks on core roles, and detailed audit trails.

-- 1. Create SECURITY DEFINER RPC to retrieve platform users safely
CREATE OR REPLACE FUNCTION public.get_platform_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  created_at TIMESTAMPTZ,
  email_confirmed_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  role_code VARCHAR(100),
  role_name VARCHAR(200),
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, auth
AS $$
BEGIN
  -- Security check: Verify executing user is Super Admin
  IF NOT EXISTS (
    SELECT 1
    FROM platform_role_assignments pra
    JOIN roles r ON r.id = pra.role_id
    WHERE pra.user_id = auth.uid()
      AND pra.is_active = true
      AND r.code = 'SUPER_ADMIN'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Access restricted to platform Super Admins';
  END IF;

  RETURN QUERY
  SELECT 
    u.id,
    u.email::VARCHAR(255),
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    COALESCE(string_agg(r.code, ','), 'None')::VARCHAR(100) as role_code,
    COALESCE(string_agg(r.name, ','), 'None')::VARCHAR(200) as role_name,
    COALESCE(bool_or(pra.is_active), false) as is_active
  FROM auth.users u
  LEFT JOIN platform_role_assignments pra ON u.id = pra.user_id
  LEFT JOIN roles r ON pra.role_id = r.id
  GROUP BY u.id, u.email, u.created_at, u.email_confirmed_at, u.last_sign_in_at
  ORDER BY u.email ASC;
END;
$$;

-- Revoke public execution rights
REVOKE ALL ON FUNCTION public.get_platform_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_users() TO authenticated;

-- 2. Core Roles Deletion/Mutation Block Trigger
CREATE OR REPLACE FUNCTION public.prevent_core_roles_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.code IN ('SUPER_ADMIN', 'sales', 'finance', 'owner', 'kepala_cabang', 'pegawai') THEN
    RAISE EXCEPTION 'Core system role % is immutable and cannot be modified or deleted.', OLD.code;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_prevent_core_roles_mutation
  BEFORE UPDATE OR DELETE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_core_roles_mutation();

-- 3. Redefine Assignment Triggers for platform_role_assignments (verify_platform_role_is_super_admin)
CREATE OR REPLACE FUNCTION public.verify_platform_role_is_super_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog, auth
AS $$
DECLARE
  v_role_code VARCHAR(50);
  v_old_role_code VARCHAR(50);
  v_active_super_admins INTEGER;
  v_super_admin_role_id UUID;
  v_is_executing_super_admin BOOLEAN;
BEGIN
  -- 1. Get role code for NEW role
  SELECT code INTO v_role_code FROM roles WHERE id = NEW.role_id;
  
  -- 2. Verify NEW role is a valid platform-level role
  IF v_role_code NOT IN ('SUPER_ADMIN', 'sales', 'finance') THEN
    RAISE EXCEPTION 'Platform role assignment must be SUPER_ADMIN, sales, or finance';
  END IF;

  -- 3. Verify executing user is Super Admin
  IF auth.uid() IS NOT NULL THEN
    v_is_executing_super_admin := EXISTS (
      SELECT 1 
      FROM platform_role_assignments pra
      JOIN roles r ON r.id = pra.role_id
      WHERE pra.user_id = auth.uid() 
        AND pra.is_active = true
        AND r.code = 'SUPER_ADMIN'
    );
    
    IF NOT v_is_executing_super_admin THEN
      RAISE EXCEPTION 'Unauthorized: Only platform Super Admins can assign platform roles.';
    END IF;
  ELSE
    -- Non-authenticated execution boundary: block unless executing role is system/service
    IF CURRENT_USER NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'Unauthorized: System role assignment bypassed in anonymous context.';
    END IF;
  END IF;

  -- 4. Get Super Admin role ID
  SELECT id INTO v_super_admin_role_id FROM roles WHERE code = 'SUPER_ADMIN';

  -- 5. Self-demotion Protection
  IF auth.uid() IS NOT NULL AND TG_OP = 'UPDATE' THEN
    IF OLD.user_id = auth.uid() AND OLD.role_id = v_super_admin_role_id THEN
      IF NEW.is_active = false OR NEW.role_id != v_super_admin_role_id THEN
        RAISE EXCEPTION 'Self-demotion protection: You cannot revoke or change your own SUPER_ADMIN privileges.';
      END IF;
    END IF;
  END IF;

  -- 6. Orphan Super Admin Protection
  IF TG_OP = 'UPDATE' AND OLD.role_id = v_super_admin_role_id AND OLD.is_active = true THEN
    IF NEW.is_active = false OR NEW.role_id != v_super_admin_role_id THEN
      SELECT COUNT(*) INTO v_active_super_admins
      FROM platform_role_assignments pra
      WHERE pra.role_id = v_super_admin_role_id AND pra.is_active = true;

      IF v_active_super_admins <= 1 THEN
        RAISE EXCEPTION 'Orphan protection: The platform must retain at least one active SUPER_ADMIN account.';
      END IF;
    END IF;
  END IF;

  -- 7. Audit Logging (Business action, actor, target, role, before, after)
  IF auth.uid() IS NOT NULL THEN
    DECLARE
      v_business_id UUID;
    BEGIN
      SELECT id INTO v_business_id FROM tenants LIMIT 1;
      
      IF v_business_id IS NOT NULL THEN
        IF TG_OP = 'UPDATE' THEN
          SELECT code INTO v_old_role_code FROM roles WHERE id = OLD.role_id;
        END IF;

        INSERT INTO public.audit_logs (
          business_id,
          actor_user_id,
          operation,
          entity,
          entity_id,
          payload_sanitized
        ) VALUES (
          v_business_id,
          auth.uid(),
          CASE 
            WHEN TG_OP = 'INSERT' THEN 'ROLE_ASSIGN'
            WHEN TG_OP = 'UPDATE' AND NEW.is_active = false THEN 'ROLE_REVOKE'
            WHEN TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true THEN 'ROLE_ACTIVATE'
            ELSE 'ROLE_UPDATE'
          END,
          'platform_role_assignments',
          NEW.user_id,
          jsonb_build_object(
            'role_code', v_role_code,
            'before', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE jsonb_build_object('is_active', OLD.is_active, 'role_code', v_old_role_code) END,
            'after', jsonb_build_object('is_active', NEW.is_active, 'role_code', v_role_code)
          )
        );
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Delete Trigger Guard
CREATE OR REPLACE FUNCTION public.verify_platform_role_assignments_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_catalog, auth
AS $$
DECLARE
  v_role_code VARCHAR(50);
  v_active_super_admins INTEGER;
  v_super_admin_role_id UUID;
  v_is_executing_super_admin BOOLEAN;
BEGIN
  SELECT code INTO v_role_code FROM roles WHERE id = OLD.role_id;

  IF auth.uid() IS NOT NULL THEN
    v_is_executing_super_admin := EXISTS (
      SELECT 1 
      FROM platform_role_assignments pra
      JOIN roles r ON r.id = pra.role_id
      WHERE pra.user_id = auth.uid() 
        AND pra.is_active = true
        AND r.code = 'SUPER_ADMIN'
    );
    
    IF NOT v_is_executing_super_admin THEN
      RAISE EXCEPTION 'Unauthorized: Only platform Super Admins can revoke platform roles.';
    END IF;
  ELSE
    IF CURRENT_USER NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      RAISE EXCEPTION 'Unauthorized: System role assignment bypassed in anonymous context.';
    END IF;
  END IF;

  SELECT id INTO v_super_admin_role_id FROM roles WHERE code = 'SUPER_ADMIN';

  -- Self-demotion Protection
  IF auth.uid() IS NOT NULL AND OLD.user_id = auth.uid() AND OLD.role_id = v_super_admin_role_id THEN
    RAISE EXCEPTION 'Self-demotion protection: You cannot revoke your own SUPER_ADMIN privileges.';
  END IF;

  -- Orphan Protection
  IF OLD.role_id = v_super_admin_role_id AND OLD.is_active = true THEN
    SELECT COUNT(*) INTO v_active_super_admins
    FROM platform_role_assignments pra
    WHERE pra.role_id = v_super_admin_role_id AND pra.is_active = true;

    IF v_active_super_admins <= 1 THEN
      RAISE EXCEPTION 'Orphan protection: The platform must retain at least one active SUPER_ADMIN account.';
    END IF;
  END IF;

  -- Audit Logging
  IF auth.uid() IS NOT NULL THEN
    DECLARE
      v_business_id UUID;
    BEGIN
      SELECT id INTO v_business_id FROM tenants LIMIT 1;
      
      IF v_business_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
          business_id,
          actor_user_id,
          operation,
          entity,
          entity_id,
          payload_sanitized
        ) VALUES (
          v_business_id,
          auth.uid(),
          'ROLE_DELETE',
          'platform_role_assignments',
          OLD.user_id,
          jsonb_build_object(
            'role_code', v_role_code,
            'before', jsonb_build_object('is_active', OLD.is_active, 'role_code', v_role_code),
            'after', NULL
          )
        );
      END IF;
    END;
  END IF;

  RETURN OLD;
END;
$$;

-- Bind delete trigger
CREATE OR REPLACE TRIGGER trg_platform_role_assignments_delete
  BEFORE DELETE ON public.platform_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_platform_role_assignments_delete();
