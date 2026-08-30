-- 00006_add_super_admin_role.sql
-- Add platform‑level SUPER_ADMIN role if it does not already exist

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE code = 'SUPER_ADMIN') THEN
    INSERT INTO roles (id, code, name, created_at)
    VALUES (gen_random_uuid(), 'SUPER_ADMIN', 'Super Administrator', now());
  END IF;
END $$;
