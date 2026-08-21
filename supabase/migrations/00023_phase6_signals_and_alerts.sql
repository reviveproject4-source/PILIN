-- Migration: 00023_phase6_signals_and_alerts.sql
-- Description: Phase 6 Management Signals & Alerts, Idempotency Constraints, Index Strategy

-- 1. MANAGEMENT SIGNALS TABLE
CREATE TABLE IF NOT EXISTS management_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL,
    signal_type VARCHAR(50) NOT NULL CHECK (signal_type IN ('ACTION_OVERDUE', 'ACTION_ESCALATED', 'CORRECTIVE_ACTION_RECOMMENDED')),
    action_plan_id UUID NOT NULL,
    target_date DATE NOT NULL,
    signal_message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_signals_action_plan_context FOREIGN KEY (action_plan_id, business_id, branch_id) REFERENCES action_plans(id, business_id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT uq_management_signal_idempotent UNIQUE (business_id, action_plan_id, signal_type, target_date)
);

-- 2. MANAGEMENT INDEX STRATEGY
CREATE INDEX IF NOT EXISTS idx_decisions_tenant_status ON decisions(business_id, status);
CREATE INDEX IF NOT EXISTS idx_action_plans_tenant_branch ON action_plans(business_id, branch_id, status);
CREATE INDEX IF NOT EXISTS idx_action_plans_maker ON action_plans(maker_user_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_due_date ON action_plans(due_date) WHERE status IN ('ACTIVE', 'IN_PROGRESS', 'SUBMITTED_FOR_RESULT');
CREATE INDEX IF NOT EXISTS idx_action_assignments_executor ON action_assignments(assigned_executor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_management_signals_lookup ON management_signals(business_id, branch_id, is_acknowledged);
