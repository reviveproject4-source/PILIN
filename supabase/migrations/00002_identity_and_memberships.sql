-- Migration: 00002_identity_and_memberships.sql
-- Description: Tenant Memberships binding Global auth.users to Tenants

CREATE TABLE IF NOT EXISTS tenant_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id UUID NOT NULL, -- FK added after roles table is created
    is_tenant_wide BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_tenant UNIQUE (user_id, business_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_business_id ON tenant_memberships(business_id);
