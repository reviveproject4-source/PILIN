-- Migration: 00024_phase6_rls_and_hardening.sql
-- Description: Phase 6 Row Level Security (RLS) Policies, Physical Hard Delete Protection Triggers, Storage Bucket Setup

-- 1. HARD DELETE PREVENTION TRIGGER FOR ALL HISTORICAL TABLES
CREATE OR REPLACE FUNCTION prevent_hard_delete_phase6()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'PHYSICAL DELETE PROHIBITED BY MINARA BOS PHASE 6 POLICY. GOVERNANCE AND HISTORICAL RECORDS ARE NON-DESTRUCTIVE.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_delete_decisions ON decisions;
CREATE TRIGGER trg_no_delete_decisions BEFORE DELETE ON decisions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_decision_history ON decision_history;
CREATE TRIGGER trg_no_delete_decision_history BEFORE DELETE ON decision_history FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_plans ON action_plans;
CREATE TRIGGER trg_no_delete_action_plans BEFORE DELETE ON action_plans FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_revisions ON action_plan_revisions;
CREATE TRIGGER trg_no_delete_action_revisions BEFORE DELETE ON action_plan_revisions FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_assignments ON action_assignments;
CREATE TRIGGER trg_no_delete_action_assignments BEFORE DELETE ON action_assignments FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_exec_logs ON action_execution_logs;
CREATE TRIGGER trg_no_delete_action_exec_logs BEFORE DELETE ON action_execution_logs FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_evidences ON action_evidences;
CREATE TRIGGER trg_no_delete_action_evidences BEFORE DELETE ON action_evidences FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_results ON action_results;
CREATE TRIGGER trg_no_delete_action_results BEFORE DELETE ON action_results FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_action_evaluations ON action_result_evaluations;
CREATE TRIGGER trg_no_delete_action_evaluations BEFORE DELETE ON action_result_evaluations FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

DROP TRIGGER IF EXISTS trg_no_delete_management_signals ON management_signals;
CREATE TRIGGER trg_no_delete_management_signals BEFORE DELETE ON management_signals FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_phase6();

-- 2. ENABLE ROW LEVEL SECURITY ON ALL 10 TABLES
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_plan_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_result_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_signals ENABLE ROW LEVEL SECURITY;

-- 3. RLS POLICIES FOR DECISIONS
DROP POLICY IF EXISTS "Owner manages decisions" ON decisions;
CREATE POLICY "Owner manages decisions" ON decisions
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id());

DROP POLICY IF EXISTS "Branch user reads decisions" ON decisions;
CREATE POLICY "Branch user reads decisions" ON decisions
    FOR SELECT TO authenticated
    USING (business_id = auth_current_business_id() AND (branch_id IS NULL OR auth_user_has_branch_access(branch_id)));

-- 4. RLS POLICIES FOR DECISION HISTORY
DROP POLICY IF EXISTS "Tenant reads decision history" ON decision_history;
CREATE POLICY "Tenant reads decision history" ON decision_history
    FOR SELECT TO authenticated
    USING (business_id = auth_current_business_id());

-- 5. RLS POLICIES FOR ACTION PLANS
DROP POLICY IF EXISTS "Owner manages action plans" ON action_plans;
CREATE POLICY "Owner manages action plans" ON action_plans
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id() AND auth_is_owner());

DROP POLICY IF EXISTS "Kepala Cabang manages branch action plans" ON action_plans;
CREATE POLICY "Kepala Cabang manages branch action plans" ON action_plans
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id() AND auth_user_has_branch_access(branch_id));

-- 6. RLS POLICIES FOR ACTION PLAN REVISIONS
DROP POLICY IF EXISTS "Tenant reads action plan revisions" ON action_plan_revisions;
CREATE POLICY "Tenant reads action plan revisions" ON action_plan_revisions
    FOR SELECT TO authenticated
    USING (business_id = auth_current_business_id());

DROP POLICY IF EXISTS "Authorized creates action plan revisions" ON action_plan_revisions;
CREATE POLICY "Authorized creates action plan revisions" ON action_plan_revisions
    FOR INSERT TO authenticated
    WITH CHECK (business_id = auth_current_business_id());

-- 7. RLS POLICIES FOR ACTION ASSIGNMENTS
DROP POLICY IF EXISTS "Tenant manages action assignments" ON action_assignments;
CREATE POLICY "Tenant manages action assignments" ON action_assignments
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id());

-- 8. RLS POLICIES FOR ACTION EXECUTION LOGS
DROP POLICY IF EXISTS "Tenant manages execution logs" ON action_execution_logs;
CREATE POLICY "Tenant manages execution logs" ON action_execution_logs
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id());

-- 9. RLS POLICIES FOR ACTION EVIDENCES
DROP POLICY IF EXISTS "Tenant manages evidences" ON action_evidences;
CREATE POLICY "Tenant manages evidences" ON action_evidences
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id());

-- 10. RLS POLICIES FOR ACTION RESULTS
DROP POLICY IF EXISTS "Tenant manages action results" ON action_results;
CREATE POLICY "Tenant manages action results" ON action_results
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id());

-- 11. RLS POLICIES FOR ACTION RESULT EVALUATIONS
DROP POLICY IF EXISTS "Owner manages evaluations" ON action_result_evaluations;
CREATE POLICY "Owner manages evaluations" ON action_result_evaluations
    FOR ALL TO authenticated
    USING (business_id = auth_current_business_id() AND auth_is_owner());

-- 12. RLS POLICIES FOR MANAGEMENT SIGNALS
DROP POLICY IF EXISTS "Tenant reads management signals" ON management_signals;
CREATE POLICY "Tenant reads management signals" ON management_signals
    FOR SELECT TO authenticated
    USING (business_id = auth_current_business_id());

-- 13. STORAGE BUCKET SETUP FOR MANAGEMENT EVIDENCES (PRIVATE BUCKET)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('management-evidences', 'management-evidences', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET public = false;

-- STORAGE BUCKET RLS POLICIES
DROP POLICY IF EXISTS "Tenant reads management evidence files" ON storage.objects;
CREATE POLICY "Tenant reads management evidence files" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'management-evidences' AND (storage.foldername(name))[1] = auth_current_business_id()::text);

DROP POLICY IF EXISTS "Tenant uploads management evidence files" ON storage.objects;
CREATE POLICY "Tenant uploads management evidence files" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'management-evidences' AND (storage.foldername(name))[1] = auth_current_business_id()::text);
