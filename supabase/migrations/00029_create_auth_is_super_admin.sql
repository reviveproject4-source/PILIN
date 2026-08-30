-- 00029_create_auth_is_super_admin.sql
-- Add helper function to determine if the current auth user is an active platform SUPER_ADMIN.

CREATE OR REPLACE FUNCTION public.auth_is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM platform_role_assignments pra
    JOIN roles r ON r.id = pra.role_id
    WHERE pra.user_id = auth.uid()
      AND pra.is_active
      AND r.code = 'SUPER_ADMIN'
  );
END;
$$;
