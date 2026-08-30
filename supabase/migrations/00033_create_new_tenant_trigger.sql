-- 00033_create_new_tenant_trigger.sql
-- Trigger to provision default feature flags for a newly created tenant.

CREATE OR REPLACE FUNCTION public.provision_tenant_feature_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO tenant_feature_flags (tenant_id, feature_code, enabled)
  SELECT NEW.id, f, FALSE
  FROM (VALUES
    ('nota_transaksi'), ('spk'), ('finance'), ('revenue'), ('sales_commission'),
    ('reminder'), ('sapaan'), ('broadcast'), ('attendance'), ('gamification'),
    ('intelligence'), ('importer'), ('service_catalog')
  ) AS v(f)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER provision_tenant_feature_flags
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION public.provision_tenant_feature_flags();
