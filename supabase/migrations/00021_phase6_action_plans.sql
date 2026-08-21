-- Migration: 00021_phase6_action_plans.sql
-- Description: Phase 6 Action Plans, Action Plan Revisions, Scope Trigger, Constraints (maker != approver)

-- 1. ACTION PLANS TABLE (NO decision_branch_id, NO source_decision_id, NO is_overdue)
CREATE TABLE IF NOT EXISTS action_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL,
    decision_id UUID,
    business_problem TEXT NOT NULL,
    business_reason TEXT NOT NULL,
    proposed_action TEXT NOT NULL,
    maker_user_id UUID NOT NULL REFERENCES auth.users(id), -- Sole Maker (Kepala Cabang Only)
    approver_user_id UUID REFERENCES auth.users(id), -- Approver (Owner Only)
    accountable_owner_user_id UUID NOT NULL REFERENCES auth.users(id),
    target_description TEXT NOT NULL,
    expected_result_description TEXT NOT NULL,
    expected_metric_name VARCHAR(100) NOT NULL,
    baseline_value NUMERIC(15,4) NOT NULL,
    target_value NUMERIC(15,4) NOT NULL,
    metric_unit VARCHAR(50) NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ACTIVE', 'IN_PROGRESS', 'SUBMITTED_FOR_RESULT', 'VERIFICATION', 'COMPLETED')),
    correlation_id UUID NOT NULL,
    causation_event_id UUID,
    source_command_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_action_plans_context UNIQUE (id, business_id, branch_id),
    CONSTRAINT fk_action_plans_branch_context FOREIGN KEY (branch_id, business_id) REFERENCES branches(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT fk_action_plans_decision_context FOREIGN KEY (decision_id, business_id) REFERENCES decisions(id, business_id) ON DELETE RESTRICT,
    CONSTRAINT chk_maker_not_approver CHECK (maker_user_id <> approver_user_id),
    CONSTRAINT chk_due_after_start CHECK (due_date >= start_date)
);

DROP TRIGGER IF EXISTS trg_action_plans_updated_at ON action_plans;
CREATE TRIGGER trg_action_plans_updated_at BEFORE UPDATE ON action_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. DECISION -> ACTION PLAN SCOPE VALIDATION TRIGGER
CREATE OR REPLACE FUNCTION validate_decision_action_plan_scope()
RETURNS TRIGGER AS $$
DECLARE
    v_decision_branch_id UUID;
BEGIN
    IF NEW.decision_id IS NOT NULL THEN
        SELECT branch_id INTO v_decision_branch_id
        FROM decisions
        WHERE id = NEW.decision_id AND business_id = NEW.business_id;

        IF v_decision_branch_id IS NOT NULL AND v_decision_branch_id <> NEW.branch_id THEN
            RAISE EXCEPTION 'CROSS-BRANCH SCOPE VIOLATION: BRANCH-SCOPED DECISION CANNOT GENERATE ACTION PLAN FOR ANOTHER BRANCH.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_decision_action_plan_scope ON action_plans;
CREATE TRIGGER trg_validate_decision_action_plan_scope BEFORE INSERT OR UPDATE ON action_plans FOR EACH ROW EXECUTE FUNCTION validate_decision_action_plan_scope();

-- 3. ACTION PLAN REVISIONS TABLE (IMMUTABLE SNAPSHOTS)
CREATE TABLE IF NOT EXISTS action_plan_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    version_number INT NOT NULL,
    requested_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    revision_reason TEXT NOT NULL,
    snapshot_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_revisions_action_plan_context FOREIGN KEY (action_plan_id, business_id, branch_id) REFERENCES action_plans(id, business_id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT uq_action_plan_revision UNIQUE (action_plan_id, version_number)
);
