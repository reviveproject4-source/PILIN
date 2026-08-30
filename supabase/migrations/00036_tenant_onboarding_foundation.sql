-- Migration: 00036_tenant_onboarding_foundation.sql
-- Description: Add create_tenant_onboarding RPC function for platform tenant onboarding

CREATE OR REPLACE FUNCTION public.create_tenant_onboarding(
  p_tenant_name VARCHAR(255),
  p_tenant_code VARCHAR(50),
  p_owner_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_tenant_id UUID;
  v_owner_role_id UUID;
  v_trimmed_name VARCHAR(255);
  v_processed_code VARCHAR(50);
BEGIN
  -- 1. Enforce that the caller is a platform-level Super Admin
  IF NOT public.auth_is_super_admin() THEN
    RAISE EXCEPTION 'Only platform Super Admins can perform tenant onboarding'
      USING ERRCODE = 'P0001'; -- User-defined exception
  END IF;

  -- 2. Validate and clean input parameters
  v_trimmed_name := trim(p_tenant_name);
  v_processed_code := lower(trim(p_tenant_code));

  IF v_trimmed_name IS NULL OR v_trimmed_name = '' THEN
    RAISE EXCEPTION 'Tenant name is required'
      USING ERRCODE = '22000'; -- Data exception
  END IF;
  
  IF v_processed_code IS NULL OR v_processed_code = '' THEN
    RAISE EXCEPTION 'Tenant code is required'
      USING ERRCODE = '22000';
  END IF;

  -- Validate tenant code format (only lowercase alphanumeric and dashes)
  IF NOT v_processed_code ~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Invalid tenant code format. Only lowercase alphanumeric characters and dashes are allowed.'
      USING ERRCODE = '22000';
  END IF;
  
  IF p_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user_id is required'
      USING ERRCODE = '22000';
  END IF;

  -- 3. Verify user exists in auth.users (to prevent invalid user_id reference)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_owner_user_id) THEN
    RAISE EXCEPTION 'User ID % does not exist in Auth', p_owner_user_id
      USING ERRCODE = '23503'; -- Foreign key violation simulation
  END IF;

  -- 4. Get the owner role ID
  SELECT id INTO v_owner_role_id
  FROM roles
  WHERE code = 'owner';

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'System role owner not found'
      USING ERRCODE = 'P0002';
  END IF;

  -- 5. Check if tenant code already exists to prevent duplication
  IF EXISTS (SELECT 1 FROM tenants WHERE code = v_processed_code) THEN
    RAISE EXCEPTION 'Tenant code % already exists', v_processed_code
      USING ERRCODE = '23505'; -- Unique violation
  END IF;

  -- 6. Insert new tenant record
  INSERT INTO tenants (name, code)
  VALUES (v_trimmed_name, v_processed_code)
  RETURNING id INTO v_tenant_id;

  -- 7. Create tenant_membership mapping for the owner (owner is tenant-wide)
  INSERT INTO tenant_memberships (user_id, business_id, role_id, is_tenant_wide, is_active)
  VALUES (p_owner_user_id, v_tenant_id, v_owner_role_id, TRUE, TRUE);

  RETURN v_tenant_id;
END;
$$;

-- Revoke execute from public
REVOKE EXECUTE ON FUNCTION public.create_tenant_onboarding(VARCHAR, VARCHAR, UUID) FROM PUBLIC;

-- Grant execute to authenticated users (who will then be validated via auth_is_super_admin())
GRANT EXECUTE ON FUNCTION public.create_tenant_onboarding(VARCHAR, VARCHAR, UUID) TO authenticated;
