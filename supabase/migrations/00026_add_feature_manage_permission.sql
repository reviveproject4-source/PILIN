-- 00007_add_feature_manage_permission.sql
-- Add permission "feature:manage" if it does not already exist

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'feature:manage') THEN
    INSERT INTO permissions (id, code, domain, description, created_at)
    VALUES (gen_random_uuid(), 'feature:manage', 'platform', 'Manage Feature Flags', now());
  END IF;
END $$;
