-- Migration: 00022_phase6_execution_and_results.sql
-- Description: Phase 6 Execution, Evidence, Results, Evaluation, Verified Evidence Immutability Trigger

-- 1. ACTION ASSIGNMENTS TABLE (APPEND-ORIENTED EXECUTION HISTORY)
CREATE TABLE IF NOT EXISTS action_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    assigned_executor_user_id UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'REASSIGNED', 'RELEASED')),
    assigned_by_user_id UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    CONSTRAINT fk_assignments_action_plan_context FOREIGN KEY (action_plan_id, business_id, branch_id) REFERENCES action_plans(id, business_id, branch_id) ON DELETE RESTRICT
);

-- UNIQUE INDEX PREVENTING DUPLICATE CONCURRENT ACTIVE ASSIGNMENTS
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_assignment ON action_assignments (action_plan_id, assigned_executor_user_id) WHERE status = 'ASSIGNED';

-- 2. ACTION EXECUTION LOGS TABLE
CREATE TABLE IF NOT EXISTS action_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    executor_user_id UUID NOT NULL REFERENCES auth.users(id),
    progress_percent INT CHECK (progress_percent BETWEEN 0 AND 100),
    notes TEXT,
    blocker_reason TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_exec_logs_action_plan_context FOREIGN KEY (action_plan_id, business_id, branch_id) REFERENCES action_plans(id, business_id, branch_id) ON DELETE RESTRICT
);

-- 3. ACTION EVIDENCES TABLE (RELATIVE STORAGE PATH ONLY - NO SIGNED URL PERSISTED)
CREATE TABLE IF NOT EXISTS action_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    submitted_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN ('CHECKLIST', 'PHOTO', 'DOCUMENT', 'REPORT', 'METRIC_SNAPSHOT', 'REFERENCE_RECORD')),
    storage_reference TEXT NOT NULL, -- Relative Path Only: business_id/branch_id/action_plan_id/evidence_id/filename
    description TEXT NOT NULL,
    verification_state VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_state IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by_user_id UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    CONSTRAINT fk_evidences_action_plan_context FOREIGN KEY (action_plan_id, business_id, branch_id) REFERENCES action_plans(id, business_id, branch_id) ON DELETE RESTRICT
);

-- VERIFIED EVIDENCE IMMUTABILITY TRIGGER
CREATE OR REPLACE FUNCTION protect_verified_evidence()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.verification_state = 'VERIFIED' THEN
        IF NEW.action_plan_id <> OLD.action_plan_id OR
           NEW.business_id <> OLD.business_id OR
           NEW.branch_id <> OLD.branch_id OR
           NEW.submitted_by_user_id <> OLD.submitted_by_user_id OR
           NEW.evidence_type <> OLD.evidence_type OR
           NEW.storage_reference <> OLD.storage_reference OR
           NEW.description <> OLD.description OR
           NEW.submitted_at <> OLD.submitted_at OR
           NEW.verified_by_user_id <> OLD.verified_by_user_id OR
           NEW.verified_at <> OLD.verified_at THEN
            RAISE EXCEPTION 'MUTATION DENIED: VERIFIED EVIDENCE IS IMMUTABLE AT DATABASE LEVEL.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_verified_evidence ON action_evidences;
CREATE TRIGGER trg_protect_verified_evidence BEFORE UPDATE ON action_evidences FOR EACH ROW EXECUTE FUNCTION protect_verified_evidence();

-- 4. ACTION RESULTS TABLE
CREATE TABLE IF NOT EXISTS action_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    metric_name_snapshot VARCHAR(100) NOT NULL,
    baseline_value_snapshot NUMERIC(15,4) NOT NULL,
    target_value_snapshot NUMERIC(15,4) NOT NULL,
    actual_value NUMERIC(15,4) NOT NULL,
    metric_unit VARCHAR(50) NOT NULL,
    measurement_period_start DATE NOT NULL,
    measurement_period_end DATE NOT NULL,
    result_summary TEXT NOT NULL,
    submitted_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by_user_id UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    CONSTRAINT fk_results_action_plan_context FOREIGN KEY (action_plan_id, business_id, branch_id) REFERENCES action_plans(id, business_id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT uq_action_results_full_context UNIQUE (id, action_plan_id, business_id, branch_id)
);

-- 5. ACTION RESULT EVALUATIONS TABLE (AGGREGATE INTEGRITY 4-COLUMN COMPOSITE FK)
CREATE TABLE IF NOT EXISTS action_result_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_plan_id UUID NOT NULL,
    business_id UUID NOT NULL,
    branch_id UUID NOT NULL,
    result_id UUID NOT NULL,
    evaluator_user_id UUID NOT NULL REFERENCES auth.users(id), -- Owner Only
    evaluation_outcome VARCHAR(50) NOT NULL CHECK (evaluation_outcome IN ('ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED')),
    evaluation_notes TEXT NOT NULL,
    corrective_action_recommended BOOLEAN DEFAULT FALSE,
    evaluated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_evaluations_result_context FOREIGN KEY (result_id, action_plan_id, business_id, branch_id) REFERENCES action_results(id, action_plan_id, business_id, branch_id) ON DELETE RESTRICT,
    CONSTRAINT uq_action_result_evaluation UNIQUE (result_id)
);
