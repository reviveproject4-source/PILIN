-- Migration: 00007_services_and_branch_catalog.sql
-- Description: Service Catalog Dual-Layer (Tenant Catalog + Branch Overrides)

-- 1. TENANT MASTER SERVICE CATALOG
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    base_harga NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (base_harga >= 0),
    hpp NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (hpp >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. BRANCH SERVICE AVAILABILITY & PRICE OVERRIDES
CREATE TABLE IF NOT EXISTS branch_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    price_override NUMERIC(15, 2) CHECK (price_override IS NULL OR price_override >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_branch_service UNIQUE (branch_id, service_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_services_business_id ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_branch_services_branch_id ON branch_services(branch_id);

-- ENABLE RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_services ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR SERVICES (TENANT CATALOG)
CREATE POLICY services_select_policy ON services
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id());

CREATE POLICY services_manage_policy ON services
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_has_permission('service:catalog:manage'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_has_permission('service:catalog:manage'));

-- POLICIES FOR BRANCH SERVICES
CREATE POLICY branch_services_select_policy ON branch_services
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id() AND auth_user_has_branch_access(branch_id));

CREATE POLICY branch_services_manage_policy ON branch_services
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_user_has_branch_access(branch_id) AND auth_has_permission('service:branch:override'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_user_has_branch_access(branch_id) AND auth_has_permission('service:branch:override'));
