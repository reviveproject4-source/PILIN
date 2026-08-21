-- Migration: 00006_customers.sql
-- Description: Customer Domain (Tenant-Level Asset) Schema & RLS

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    nama VARCHAR(255) NOT NULL,
    no_hp VARCHAR(50),
    no_hp_normalized VARCHAR(50),
    email VARCHAR(255),
    alamat TEXT,
    source_system VARCHAR(50) DEFAULT 'minara' NOT NULL,
    source_customer_id VARCHAR(100),
    tags TEXT[] DEFAULT '{}'::text[],
    created_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_customer_source_identity UNIQUE (business_id, source_system, source_customer_id)
);

-- INDEXES FOR FAST LOOKUP & DEDUPLICATION
CREATE INDEX IF NOT EXISTS idx_customers_business_id ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_normalized ON customers(business_id, no_hp_normalized);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(business_id, email);

-- ENABLE RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR CUSTOMERS
-- 1. READ: Tenant-wide read access for any active tenant member with customer:read
CREATE POLICY customers_select_policy ON customers
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_has_permission('customer:read')
  );

-- 2. INSERT: Create customer permission
CREATE POLICY customers_insert_policy ON customers
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_has_permission('customer:create')
  );

-- 3. UPDATE: Update customer permission
CREATE POLICY customers_update_policy ON customers
  FOR UPDATE TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_has_permission('customer:update')
  )
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_has_permission('customer:update')
  );
