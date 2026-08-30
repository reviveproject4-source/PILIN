-- Migration: 00034_fix_super_admin_tenant_rls.sql
-- Description: Fix RLS policies for platform Super Admin on tenants and tenant_feature_flags

-- 1. ADD SELECT POLICY FOR SUPER_ADMIN ON public.tenants
CREATE POLICY tenants_super_admin_select
ON public.tenants
FOR SELECT
TO authenticated
USING (
  public.auth_is_super_admin()
);

-- 2. RECREATE tenant_feature_flags POLICIES FOR SUPER_ADMIN WITHOUT auth_has_permission
DROP POLICY IF EXISTS ff_super_admin_select ON public.tenant_feature_flags;
DROP POLICY IF EXISTS ff_super_admin_insert ON public.tenant_feature_flags;
DROP POLICY IF EXISTS ff_super_admin_update ON public.tenant_feature_flags;
DROP POLICY IF EXISTS ff_super_admin_delete ON public.tenant_feature_flags;

-- Recreate SELECT policy
CREATE POLICY ff_super_admin_select ON public.tenant_feature_flags
FOR SELECT USING (
  public.auth_is_super_admin()
);

-- Recreate INSERT policy
CREATE POLICY ff_super_admin_insert ON public.tenant_feature_flags
FOR INSERT WITH CHECK (
  public.auth_is_super_admin()
);

-- Recreate UPDATE policy
CREATE POLICY ff_super_admin_update ON public.tenant_feature_flags
FOR UPDATE USING (
  public.auth_is_super_admin()
) WITH CHECK (
  public.auth_is_super_admin()
);

-- Recreate DELETE policy
CREATE POLICY ff_super_admin_delete ON public.tenant_feature_flags
FOR DELETE USING (
  public.auth_is_super_admin()
);
