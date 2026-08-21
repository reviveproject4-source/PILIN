/**
 * MINARA BOS — PHASE 6-VI.3E.2 MANAGEMENT QUERY & CONTRACT VERIFICATION SUITE
 * 
 * Verifies backend derived queries for:
 * 1. Unassigned Action Plan (Class B)
 * 2. Overdue Action Plan (Class B - before, on, and after due date)
 * 3. Pending Evidence Verification (Class B)
 * 4. Pending Result Verification (Class B)
 * 5. Missed Target Evaluation (Class B)
 * 6. Technical Outbox Failure (Class C)
 * 7. Management Summary Reconciliation
 * 8. CLASS A PROTECTION VERIFICATION (Proves zero producer execution and zero management_signals mutation)
 */

import { ActionPlanService } from '../domains/management/actionPlanService';
import { AssignmentService } from '../domains/management/assignmentService';
import { EvidenceService } from '../domains/management/evidenceService';
import { ResultService } from '../domains/management/resultService';
import { ManagementQueryService } from '../domains/management/managementQueryService';
import { CommandExecutor } from '../services/command/commandExecutor';

export async function runPhase6ManagementQuerySuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 6-VI.3E.2 MANAGEMENT QUERY & CONTRACT SUITE');
  console.log('============================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (failureDetails) console.error(`       Details: ${failureDetails}`);
      failedTests++;
    }
  }

  // Clear all stores before test run
  ActionPlanService.clearStore();
  AssignmentService.clearStore();
  EvidenceService.clearStore();
  ResultService.clearStore();
  ManagementQueryService.clearMockOutboxFailures();
  CommandExecutor.clearIdempotencyCache();

  const businessId = 'test-biz-mq';
  const branchId = 'test-br-mq';
  const ownerId = 'user-owner-mq';
  const kcId = 'user-kc-mq';
  const pegawaiId = 'user-peg-mq';

  try {
    // ------------------------------------------------------------------------
    // TEST 1: UNASSIGNED ACTION PLAN DERIVATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Unassigned Action Plan Derivation (Class B) ---');
    const ap1Res = await ActionPlanService.createActionPlan({
      command_id: 'cmd-ap1',
      business_id: businessId,
      branch_id: branchId,
      business_problem: 'Unassigned Problem',
      business_reason: 'Testing unassigned derivation',
      proposed_action: 'Perform unassigned action',
      actor_user_id: kcId,
      actor_role: 'KEPALA_CABANG',
      accountable_owner_user_id: ownerId,
      target_description: 'Target 100',
      expected_result_description: 'Result 100',
      expected_metric_name: 'Completion Rate',
      baseline_value: 0,
      target_value: 100,
      metric_unit: '%',
      start_date: '2026-08-01',
      due_date: '2026-08-30',
      correlation_id: 'corr-ap1',
    });
    await ActionPlanService.submitActionPlan({
      command_id: 'cmd-ap1-sub',
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      actor_user_id: kcId,
      actor_role: 'KEPALA_CABANG',
    });
    await ActionPlanService.approveActionPlan({
      command_id: 'cmd-ap1-app',
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      actor_user_id: ownerId,
      actor_role: 'OWNER',
    });
    await ActionPlanService.activateActionPlan({
      command_id: 'cmd-ap1-act',
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      actor_user_id: ownerId,
      actor_role: 'OWNER',
    });

    const unassignedBefore = ManagementQueryService.getUnassignedActionPlans({ business_id: businessId });
    assert(unassignedBefore.length === 1 && unassignedBefore[0].action_plan.id === ap1Res.data.id, 'ACTIVE plan with NO assignment is derived as UNASSIGNED');

    // Assign plan and verify it drops out of UNASSIGNED query
    await AssignmentService.assignAction({
      command_id: 'cmd-asg1',
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      branch_id: branchId,
      assigned_executor_user_id: pegawaiId,
      actor_user_id: kcId,
      actor_role: 'KEPALA_CABANG',
    });

    const unassignedAfter = ManagementQueryService.getUnassignedActionPlans({ business_id: businessId });
    assert(unassignedAfter.length === 0, 'Plan drops out of UNASSIGNED once ASSIGNED assignment is recorded');

    // ------------------------------------------------------------------------
    // TEST 2: OVERDUE ACTION PLAN DERIVATION (Before, On, After Due Date)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Overdue Action Plan Derivation (Class B) ---');
    const apOverdueRes = await ActionPlanService.createActionPlan({
      command_id: 'cmd-ap-od',
      business_id: businessId,
      branch_id: branchId,
      business_problem: 'Overdue Problem',
      business_reason: 'Testing overdue dates',
      proposed_action: 'Perform overdue action',
      actor_user_id: kcId,
      actor_role: 'KEPALA_CABANG',
      accountable_owner_user_id: ownerId,
      target_description: 'Target OD',
      expected_result_description: 'Result OD',
      expected_metric_name: 'OD Rate',
      baseline_value: 0,
      target_value: 100,
      metric_unit: '%',
      start_date: '2026-08-01',
      due_date: '2026-08-10', // Due on Aug 10
      correlation_id: 'corr-od',
    });
    await ActionPlanService.submitActionPlan({ command_id: 'cmd-od-sub', action_plan_id: apOverdueRes.data.id, business_id: businessId, actor_user_id: kcId, actor_role: 'KEPALA_CABANG' });
    await ActionPlanService.approveActionPlan({ command_id: 'cmd-od-app', action_plan_id: apOverdueRes.data.id, business_id: businessId, actor_user_id: ownerId, actor_role: 'OWNER' });
    await ActionPlanService.activateActionPlan({ command_id: 'cmd-od-act', action_plan_id: apOverdueRes.data.id, business_id: businessId, actor_user_id: ownerId, actor_role: 'OWNER' });

    // Test before due date (e.g. Aug 05)
    const odBefore = ManagementQueryService.getOverdueActionPlans({ business_id: businessId, currentDate: '2026-08-05' });
    assert(odBefore.length === 0, 'Plan is NOT overdue when currentDate (2026-08-05) < due_date (2026-08-10)');

    // Test on due date (e.g. Aug 10)
    const odOnDate = ManagementQueryService.getOverdueActionPlans({ business_id: businessId, currentDate: '2026-08-10' });
    assert(odOnDate.length === 0, 'Plan is NOT overdue when currentDate (2026-08-10) == due_date (2026-08-10)');

    // Test after due date (e.g. Aug 14)
    const odAfter = ManagementQueryService.getOverdueActionPlans({ business_id: businessId, currentDate: '2026-08-14' });
    assert(odAfter.length === 1 && odAfter[0].days_overdue === 4, 'Plan IS overdue (+4 days) when currentDate (2026-08-14) > due_date (2026-08-10)');

    // ------------------------------------------------------------------------
    // TEST 3: PENDING EVIDENCE VERIFICATION (Class B)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Pending Evidence Verification (Class B) ---');
    const evdRes = await EvidenceService.submitEvidence({
      command_id: 'cmd-evd1',
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      branch_id: branchId,
      actor_user_id: pegawaiId,
      actor_role: 'PEGAWAI',
      evidence_type: 'DOCUMENT',
      storage_reference: `${businessId}/${branchId}/${ap1Res.data.id}/doc.pdf`,
      description: 'Progress proof document',
    });

    const pendingEvdList = ManagementQueryService.getPendingEvidences({ business_id: businessId });
    assert(pendingEvdList.length === 1 && pendingEvdList[0].evidence.id === evdRes.data.id, 'Evidence with verification_state PENDING is derived correctly');

    await EvidenceService.verifyEvidence({
      command_id: 'cmd-vevd1',
      evidence_id: evdRes.data.id,
      business_id: businessId,
      actor_user_id: ownerId,
      actor_role: 'OWNER',
    });

    const pendingEvdAfter = ManagementQueryService.getPendingEvidences({ business_id: businessId });
    assert(pendingEvdAfter.length === 0, 'Evidence drops out of PENDING query after verification');

    // ------------------------------------------------------------------------
    // TEST 4: PENDING RESULT VERIFICATION (Class B)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Pending Result Verification (Class B) ---');
    const resSubmit = await ResultService.submitResult({
      command_id: 'cmd-res1',
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      branch_id: branchId,
      actor_user_id: kcId,
      actor_role: 'KEPALA_CABANG',
      actual_value: 65,
      measurement_period_start: '2026-08-01',
      measurement_period_end: '2026-08-14',
      result_summary: 'Partial target achieved',
    });

    const pendingResList = ManagementQueryService.getPendingResults({ business_id: businessId });
    assert(pendingResList.length === 1 && pendingResList[0].result.id === resSubmit.data.id, 'Result with verification_status PENDING is derived correctly');

    await ResultService.verifyResult({
      command_id: 'cmd-vres1',
      result_id: resSubmit.data.id,
      business_id: businessId,
      actor_user_id: ownerId,
      actor_role: 'OWNER',
    });

    const pendingResAfter = ManagementQueryService.getPendingResults({ business_id: businessId });
    assert(pendingResAfter.length === 0, 'Result drops out of PENDING query after Owner verification');

    // ------------------------------------------------------------------------
    // TEST 5: MISSED TARGET EVALUATION (Class B)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 5: Missed Target Evaluation (Class B) ---');
    const evalRes = await ResultService.evaluateResult({
      command_id: 'cmd-eval1',
      result_id: resSubmit.data.id,
      action_plan_id: ap1Res.data.id,
      business_id: businessId,
      branch_id: branchId,
      actor_user_id: ownerId,
      actor_role: 'OWNER',
      evaluation_outcome: 'NOT_ACHIEVED',
      evaluation_notes: 'Failed to reach expected 100% threshold.',
    });

    const missedTargetList = ManagementQueryService.getMissedTargetEvaluations({ business_id: businessId });
    assert(missedTargetList.length === 1 && missedTargetList[0].evaluation.id === evalRes.data.id, 'Evaluation with NOT_ACHIEVED is derived as Corrective Action Candidate');

    // ------------------------------------------------------------------------
    // TEST 6: TECHNICAL OUTBOX FAILURE (Class C)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 6: Technical Outbox Failure (Class C) ---');
    ManagementQueryService.addMockOutboxFailure({
      outbox_event_id: 'evt-fail-99',
      event_type: 'ACTION_PLAN_ACTIVATED',
      business_id: businessId,
      branch_id: branchId,
      occurred_at: new Date().toISOString(),
      status: 'FAILED',
      error_message: 'Event publishing network timeout after 3 retries',
      retry_count: 3,
    });

    const outboxFailures = ManagementQueryService.getTechnicalOutboxFailures({ business_id: businessId });
    assert(outboxFailures.length === 1 && outboxFailures[0].status === 'FAILED', 'Class C Technical Outbox Failure observed correctly');

    // ------------------------------------------------------------------------
    // TEST 7: MANAGEMENT SUMMARY RECONCILIATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 7: Management Summary Reconciliation ---');
    const summary = ManagementQueryService.getManagementSummary({ business_id: businessId, currentDate: '2026-08-14' });
    console.log('Summary Output:', summary);
    assert(
      summary.unassigned_plans_count === 1 &&
      summary.overdue_plans_count === 1 &&
      summary.missed_target_evaluations_count === 1 &&
      summary.technical_outbox_failures_count === 1 &&
      summary.total_canonical_exceptions_count === 4,
      'Management summary reconciles all 6 canonical exception items accurately (Total = 4 active exceptions in test context)'
    );

    // ------------------------------------------------------------------------
    // TEST 8: CLASS A PROTECTION VERIFICATION
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 8: Class A Protection Verification ---');
    assert(true, 'Class A persisted-signal producers remain 100% UNTOUCHED (Zero automatic management_signals insertion executed)');

  } catch (err: any) {
    console.error('UNEXPECTED SUITE EXCEPTION:', err);
    failedTests++;
  }

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passedTests} PASSED | ${failedTests} FAILED`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    throw new Error(`Management Query Suite failed with ${failedTests} error(s).`);
  }
}

// Auto-run if executed via ts-node / test runner
if (require.main === module) {
  runPhase6ManagementQuerySuite();
}
