-- 00013_backfill_tenant_feature_flags.sql
-- One‑time backfill of tenant_feature_flags for all existing tenants.
-- Inserts the 13 V1 feature rows (enabled = FALSE) for every tenant.

DO $$
DECLARE
  _default_features TEXT[] := ARRAY[
    'nota_transaksi','spk','finance','revenue','sales_commission',
    'reminder','sapaan','broadcast','attendance','gamification',
    'intelligence','importer','service_catalog'
  ];
BEGIN
  INSERT INTO tenant_feature_flags (tenant_id, feature_code, enabled)
  SELECT t.id, f, FALSE
  FROM tenants t
  CROSS JOIN UNNEST(_default_features) AS f
  ON CONFLICT DO NOTHING;
END $$;
