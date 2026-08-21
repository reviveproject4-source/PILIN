-- Migration: 00013_revenue_and_promotions.sql
-- Description: Revenue & Promotion Domain (Auto Promotion Trigger & Proposals)

-- 1. PROMO RULES (System / Tenant Level Baseline Drop Threshold)
CREATE TABLE IF NOT EXISTS promo_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    drop_threshold_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (drop_threshold_percent > 0 AND drop_threshold_percent <= 100),
    excluded_day_start INTEGER DEFAULT 15 CHECK (excluded_day_start >= 1 AND excluded_day_start <= 31),
    excluded_day_end INTEGER DEFAULT 23 CHECK (excluded_day_end >= 1 AND excluded_day_end <= 31),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. PROMO PROPOSALS (Kepala Cabang Proposes Service to Promote)
CREATE TABLE IF NOT EXISTS promo_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    proposed_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    proposed_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 10.00 CHECK (proposed_discount_percent > 0 AND proposed_discount_percent <= 100),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approval_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    action_at TIMESTAMPTZ
);

-- 3. PROMO EVENTS (Automatically Triggered When Threshold Drop Occurs)
CREATE TABLE IF NOT EXISTS promo_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    promo_rule_id UUID REFERENCES promo_rules(id) ON DELETE SET NULL,
    promo_proposal_id UUID REFERENCES promo_proposals(id) ON DELETE SET NULL,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    discount_percent NUMERIC(5, 2) NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED'))
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_promo_rules_business ON promo_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_promo_proposals_branch ON promo_proposals(branch_id);
CREATE INDEX IF NOT EXISTS idx_promo_events_branch ON promo_events(branch_id);

-- ENABLE RLS
ALTER TABLE promo_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_events ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PROMO RULES
CREATE POLICY promo_rules_select_policy ON promo_rules
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id());

CREATE POLICY promo_rules_manage_policy ON promo_rules
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_is_owner())
  WITH CHECK (business_id = auth_current_business_id() AND auth_is_owner());

-- POLICIES FOR PROMO PROPOSALS
CREATE POLICY promo_proposals_select_policy ON promo_proposals
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );

CREATE POLICY promo_proposals_insert_policy ON promo_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );

CREATE POLICY promo_proposals_update_policy ON promo_proposals
  FOR UPDATE TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_is_owner()
  )
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_is_owner()
  );

-- POLICIES FOR PROMO EVENTS
CREATE POLICY promo_events_select_policy ON promo_events
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );
