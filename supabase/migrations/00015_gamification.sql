-- Migration: 00015_gamification.sql
-- Description: Gamification & Operational Performance Metrics

CREATE TABLE IF NOT EXISTS branch_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    period_date DATE NOT NULL,
    completed_transactions_count INTEGER DEFAULT 0 NOT NULL,
    revenue_amount NUMERIC(15, 2) DEFAULT 0 NOT NULL,
    new_customers_count INTEGER DEFAULT 0 NOT NULL,
    points_earned INTEGER DEFAULT 0 NOT NULL,
    rank_tier VARCHAR(50) DEFAULT 'BRONZE' CHECK (rank_tier IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_branch_period UNIQUE (branch_id, period_date)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_branch_performance_business ON branch_performance_metrics(business_id);
CREATE INDEX IF NOT EXISTS idx_branch_performance_date ON branch_performance_metrics(period_date);

-- ENABLE RLS
ALTER TABLE branch_performance_metrics ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR GAMIFICATION METRICS
CREATE POLICY branch_performance_select_policy ON branch_performance_metrics
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );
