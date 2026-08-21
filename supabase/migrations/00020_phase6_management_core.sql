-- Migration: 00020_phase6_management_core.sql
-- Description: Phase 6 Management Control Core Entities (decisions, decision_history, Composite Parent Constraints, Self-Reference FK)

-- 1. AUTOMATION TRIGGER FOR UPDATED_AT (IF NOT EXISTS)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. DECISIONS TABLE
CREATE TABLE IF NOT EXISTS decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE RESTRICT, -- NULL = Tenant-Wide Scope
    decision_type VARCHAR(50) NOT NULL CHECK (decision_type IN ('STRATEGIC', 'OPERATIONAL', 'PROCESS_IMPROVEMENT', 'QUALITY_CONTROL', 'COST_REDUCTION')),
    title VARCHAR(255) NOT NULL,
    business_reason TEXT NOT NULL,
    source_insight_signal_ref VARCHAR(255),
    decision_owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    approved_by_user_id UUID REFERENCES auth.users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'APPROVED', 'REJECTED', 'ACTIVE', 'EVALUATED', 'CLOSED', 'CANCELLED', 'SUPERSEDED')),
    superseded_by_decision_id UUID,
    effective_start_at TIMESTAMPTZ,
    effective_end_at TIMESTAMPTZ,
    correlation_id UUID NOT NULL,
    causation_event_id UUID,
    source_command_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_decisions_context UNIQUE (id, business_id),
    CONSTRAINT uq_decisions_full_context UNIQUE (id, business_id, branch_id),
    CONSTRAINT fk_decisions_branch_context FOREIGN KEY (branch_id, business_id) REFERENCES branches(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_decisions_superseded_context FOREIGN KEY (superseded_by_decision_id, business_id) REFERENCES decisions(id, business_id) ON DELETE RESTRICT
);

DROP TRIGGER IF EXISTS trg_decisions_updated_at ON decisions;
CREATE TRIGGER trg_decisions_updated_at BEFORE UPDATE ON decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. DECISION HISTORY TABLE
CREATE TABLE IF NOT EXISTS decision_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL,
    business_id UUID NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    notes TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_decision_history_context FOREIGN KEY (decision_id, business_id) REFERENCES decisions(id, business_id) ON DELETE RESTRICT
);
