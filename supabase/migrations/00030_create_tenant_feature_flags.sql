-- 00011_create_tenant_feature_flags.sql
-- Create table for per‑tenant feature flags and enforce allowed feature codes.

CREATE TABLE IF NOT EXISTS tenant_feature_flags (
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_code TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (tenant_id, feature_code),
  CHECK (feature_code IN (
    'nota_transaksi', 'spk', 'finance', 'revenue', 'sales_commission',
    'reminder', 'sapaan', 'broadcast', 'attendance', 'gamification',
    'intelligence', 'importer', 'service_catalog'
  ))
);
