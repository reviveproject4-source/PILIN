-- Migration: 00035_enable_platform_role_assignments_rls.sql
-- Description: Enable RLS and secure platform_role_assignments table

ALTER TABLE public.platform_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_role_assignments_select
ON public.platform_role_assignments
FOR SELECT
TO authenticated
USING (
  public.auth_is_super_admin()
);
