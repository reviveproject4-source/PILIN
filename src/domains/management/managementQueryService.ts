/**
 * MINARA BOS — PHASE 6 MANAGEMENT QUERY SERVICE
 * 
 * Implements backend-derived queries for:
 * - Class B Derived Management Conditions (Unassigned Plans, Overdue Plans, Pending Evidences, Pending Results, Missed Target Evaluations)
 * - Class C Technical Observation (Technical Outbox Failures)
 * 
 * NO DIRECT CLASS A DEPENDENCY. All business exceptions are derived directly from authoritative primary domain tables.
 */

import { ActionPlanService, ActionPlanRecord } from './actionPlanService';
import { AssignmentService, AssignmentRecord } from './assignmentService';
import { EvidenceService, EvidenceRecord } from './evidenceService';
import { ResultService, ActionResultRecord, ActionResultEvaluationRecord } from './resultService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export interface UnassignedActionPlanQueryItem {
  action_plan: ActionPlanRecord;
  derivation_reason: string;
}

export interface OverdueActionPlanQueryItem {
  action_plan: ActionPlanRecord;
  days_overdue: number;
  derivation_reason: string;
}

export interface PendingEvidenceQueryItem {
  evidence: EvidenceRecord;
  action_plan?: ActionPlanRecord;
  derivation_reason: string;
}

export interface PendingResultQueryItem {
  result: ActionResultRecord;
  action_plan?: ActionPlanRecord;
  derivation_reason: string;
}

export interface MissedTargetEvaluationQueryItem {
  evaluation: ActionResultEvaluationRecord;
  result?: ActionResultRecord;
  action_plan?: ActionPlanRecord;
  corrective_action_candidate: boolean;
  derivation_reason: string;
}

export interface TechnicalOutboxFailureQueryItem {
  outbox_event_id: string;
  event_type: string;
  business_id: string;
  branch_id?: string;
  occurred_at: string;
  status: 'FAILED';
  error_message: string;
  retry_count: number;
}

export interface ManagementSummaryCounts {
  unassigned_plans_count: number;
  overdue_plans_count: number;
  pending_evidences_count: number;
  pending_results_count: number;
  missed_target_evaluations_count: number;
  technical_outbox_failures_count: number;
  total_canonical_exceptions_count: number;
}

export class ManagementQueryService {
  private static mockFailedOutboxEvents: TechnicalOutboxFailureQueryItem[] = [];

  static clearMockOutboxFailures() {
    this.mockFailedOutboxEvents = [];
  }

  static addMockOutboxFailure(item: TechnicalOutboxFailureQueryItem) {
    this.mockFailedOutboxEvents.push(item);
  }

  /**
   * 1. UNASSIGNED ACTION PLAN (Class B Derived Condition)
   * 
   * Canonical SQL Predicate:
   * action_plans.status = 'ACTIVE'
   * AND NOT EXISTS (
   *     SELECT 1 FROM action_assignments
   *     WHERE action_assignments.action_plan_id = action_plans.id
   *       AND action_assignments.status = 'ASSIGNED'
   * )
   */
  static getUnassignedActionPlans(params: {
    business_id: string;
    branch_id?: string;
  }): UnassignedActionPlanQueryItem[] {
    const allPlans: ActionPlanRecord[] = (ActionPlanService as any).mockActionPlans
      ? Array.from((ActionPlanService as any).mockActionPlans.values() as Iterable<ActionPlanRecord>)
      : [];

    const allAssignments: AssignmentRecord[] = (AssignmentService as any).mockAssignments
      ? Array.from((AssignmentService as any).mockAssignments.values() as Iterable<AssignmentRecord>)
      : [];

    return allPlans
      .filter((plan) => {
        if (plan.business_id !== params.business_id) return false;
        if (params.branch_id && plan.branch_id !== params.branch_id) return false;
        if (plan.status !== 'ACTIVE') return false;

        // Check NOT EXISTS active assignment
        const hasAssigned = allAssignments.some(
          (asg) => asg.action_plan_id === plan.id && asg.status === 'ASSIGNED'
        );
        return !hasAssigned;
      })
      .map((plan) => ({
        action_plan: plan,
        derivation_reason: "An ACTIVE Action Plan for which no ASSIGNED action_assignment record exists.",
      }));
  }

  /**
   * 2. OVERDUE ACTION PLAN (Class B Derived Condition)
   * 
   * Canonical SQL Predicate:
   * action_plans.due_date < CURRENT_DATE
   * AND action_plans.status IN ('ACTIVE', 'IN_PROGRESS', 'SUBMITTED_FOR_RESULT')
   */
  static getOverdueActionPlans(params: {
    business_id: string;
    branch_id?: string;
    currentDate?: string;
  }): OverdueActionPlanQueryItem[] {
    const todayStr = params.currentDate || new Date().toISOString().substring(0, 10);
    const todayTime = new Date(todayStr).getTime();

    const allPlans: ActionPlanRecord[] = (ActionPlanService as any).mockActionPlans
      ? Array.from((ActionPlanService as any).mockActionPlans.values() as Iterable<ActionPlanRecord>)
      : [];

    const eligibleStatuses = ['ACTIVE', 'IN_PROGRESS', 'SUBMITTED_FOR_RESULT'];

    return allPlans
      .filter((plan) => {
        if (plan.business_id !== params.business_id) return false;
        if (params.branch_id && plan.branch_id !== params.branch_id) return false;
        if (!eligibleStatuses.includes(plan.status)) return false;

        const dueTime = new Date(plan.due_date).getTime();
        return dueTime < todayTime;
      })
      .map((plan) => {
        const dueTime = new Date(plan.due_date).getTime();
        const diffMs = todayTime - dueTime;
        const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
          action_plan: plan,
          days_overdue: daysOverdue,
          derivation_reason: `Target due_date (${plan.due_date}) is less than current_date (${todayStr}) in active execution state '${plan.status}'.`,
        };
      });
  }

  /**
   * 3. PENDING EVIDENCE VERIFICATION (Class B Derived Condition)
   * 
   * Canonical SQL Predicate:
   * action_evidences.verification_state = 'PENDING'
   */
  static getPendingEvidences(params: {
    business_id: string;
    branch_id?: string;
  }): PendingEvidenceQueryItem[] {
    const allEvidences: EvidenceRecord[] = (EvidenceService as any).mockEvidences
      ? Array.from((EvidenceService as any).mockEvidences.values() as Iterable<EvidenceRecord>)
      : [];

    return allEvidences
      .filter((evd) => {
        if (evd.business_id !== params.business_id) return false;
        if (params.branch_id && evd.branch_id !== params.branch_id) return false;
        return evd.verification_state === 'PENDING';
      })
      .map((evd) => ({
        evidence: evd,
        action_plan: ActionPlanService.getActionPlan(evd.action_plan_id),
        derivation_reason: 'Operational evidence submitted awaiting Owner verification.',
      }));
  }

  /**
   * 4. PENDING RESULT VERIFICATION (Class B Derived Condition)
   * 
   * Canonical SQL Predicate:
   * action_results.verification_status = 'PENDING'
   */
  static getPendingResults(params: {
    business_id: string;
    branch_id?: string;
  }): PendingResultQueryItem[] {
    const allResults: ActionResultRecord[] = (ResultService as any).mockResults
      ? Array.from((ResultService as any).mockResults.values() as Iterable<ActionResultRecord>)
      : [];

    return allResults
      .filter((res) => {
        if (res.business_id !== params.business_id) return false;
        if (params.branch_id && res.branch_id !== params.branch_id) return false;
        return res.verification_status === 'PENDING';
      })
      .map((res) => ({
        result: res,
        action_plan: ActionPlanService.getActionPlan(res.action_plan_id),
        derivation_reason: 'Execution result submitted awaiting formal Owner verification.',
      }));
  }

  /**
   * 5. MISSED TARGET EVALUATION (Class B Derived Condition)
   * 
   * Canonical SQL Predicate:
   * action_result_evaluations.evaluation_outcome = 'NOT_ACHIEVED'
   */
  static getMissedTargetEvaluations(params: {
    business_id: string;
    branch_id?: string;
  }): MissedTargetEvaluationQueryItem[] {
    const allEvaluations: ActionResultEvaluationRecord[] = (ResultService as any).mockEvaluations
      ? Array.from((ResultService as any).mockEvaluations.values() as Iterable<ActionResultEvaluationRecord>)
      : [];

    return allEvaluations
      .filter((evalRec) => {
        if (evalRec.business_id !== params.business_id) return false;
        if (params.branch_id && evalRec.branch_id !== params.branch_id) return false;
        return evalRec.evaluation_outcome === 'NOT_ACHIEVED';
      })
      .map((evalRec) => ({
        evaluation: evalRec,
        result: ResultService.getResult(evalRec.result_id),
        action_plan: ActionPlanService.getActionPlan(evalRec.action_plan_id),
        corrective_action_candidate: true,
        derivation_reason: 'Evaluation outcome NOT_ACHIEVED flags a Corrective Action Candidate for explicit human review.',
      }));
  }

  /**
   * 6. TECHNICAL OUTBOX FAILURE (Class C Technical Observation)
   * 
   * Canonical SQL Predicate:
   * outbox_events.status = 'FAILED'
   */
  static getTechnicalOutboxFailures(params: {
    business_id: string;
  }): TechnicalOutboxFailureQueryItem[] {
    return this.mockFailedOutboxEvents.filter((item) => item.business_id === params.business_id);
  }

  /**
   * MANAGEMENT SUMMARY COUNTS (Reconciled Total = 6 Canonical Exception Items)
   */
  static getManagementSummary(params: {
    business_id: string;
    branch_id?: string;
    currentDate?: string;
  }): ManagementSummaryCounts {
    const unassigned = this.getUnassignedActionPlans(params);
    const overdue = this.getOverdueActionPlans(params);
    const pendingEvidences = this.getPendingEvidences(params);
    const pendingResults = this.getPendingResults(params);
    const missedTargets = this.getMissedTargetEvaluations(params);
    const technicalFailures = this.getTechnicalOutboxFailures({ business_id: params.business_id });

    const total =
      unassigned.length +
      overdue.length +
      pendingEvidences.length +
      pendingResults.length +
      missedTargets.length +
      technicalFailures.length;

    return {
      unassigned_plans_count: unassigned.length,
      overdue_plans_count: overdue.length,
      pending_evidences_count: pendingEvidences.length,
      pending_results_count: pendingResults.length,
      missed_target_evaluations_count: missedTargets.length,
      technical_outbox_failures_count: technicalFailures.length,
      total_canonical_exceptions_count: total,
    };
  }
}
