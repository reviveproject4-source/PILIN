-- 00028_add_super_admin_role_permission.sql
-- Grant the SUPER_ADMIN role the permission "feature:manage"

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'feature:manage') THEN
    RAISE EXCEPTION 'Permission feature:manage does not exist';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM roles WHERE code = 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'SUPER_ADMIN role does not exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE r.code = 'SUPER_ADMIN' AND p.code = 'feature:manage'
  ) THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.code = 'SUPER_ADMIN' AND p.code = 'feature:manage';
  END IF;
END $$;
