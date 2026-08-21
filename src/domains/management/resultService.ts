/**
 * MINARA BOS — RESULT DOMAIN SERVICE
 * 
 * Implements result management commands:
 * SUBMIT_ACTION_RESULT, VERIFY_ACTION_RESULT, EVALUATE_ACTION_RESULT.
 */

import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { ActionPlanService } from './actionPlanService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export interface ActionResultRecord {
  id: string;
  action_plan_id: string;
  business_id: string;
  branch_id: string;
  metric_name_snapshot: string;
  baseline_value_snapshot: number;
  target_value_snapshot: number;
  actual_value: number;
  metric_unit: string;
  measurement_period_start: string;
  measurement_period_end: string;
  result_summary: string;
  submitted_by_user_id: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verified_by_user_id?: string;
  submitted_at: string;
  verified_at?: string;
}

export interface ActionResultEvaluationRecord {
  id: string;
  action_plan_id: string;
  business_id: string;
  branch_id: string;
  result_id: string;
  evaluator_user_id: string;
  evaluation_outcome: 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'NOT_ACHIEVED';
  evaluation_notes: string;
  corrective_action_recommended: boolean;
  evaluated_at: string;
}

export class ResultService {
  private static mockResults = new Map<string, ActionResultRecord>();
  private static mockEvaluations = new Map<string, ActionResultEvaluationRecord>();

  static clearStore() {
    this.mockResults.clear();
    this.mockEvaluations.clear();
  }

  static getResult(id: string): ActionResultRecord | undefined {
    return this.mockResults.get(id);
  }

  static getEvaluation(id: string): ActionResultEvaluationRecord | undefined {
    return this.mockEvaluations.get(id);
  }

  /**
   * SUBMIT_ACTION_RESULT
   */
  static async submitResult(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    branch_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    actual_value: number;
    measurement_period_start: string;
    measurement_period_end: string;
    result_summary: string;
  }) {
    const auth = ManagementAuthorization.authorize('SUBMIT_ACTION_RESULT', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const resultId = `res-${params.command_id}`;
    const record: ActionResultRecord = {
      id: resultId,
      action_plan_id: params.action_plan_id,
      business_id: params.business_id,
      branch_id: params.branch_id,
      metric_name_snapshot: plan.expected_metric_name,
      baseline_value_snapshot: plan.baseline_value,
      target_value_snapshot: plan.target_value,
      actual_value: params.actual_value,
      metric_unit: plan.metric_unit,
      measurement_period_start: params.measurement_period_start,
      measurement_period_end: params.measurement_period_end,
      result_summary: params.result_summary,
      submitted_by_user_id: params.actor_user_id,
      verification_status: 'PENDING',
      submitted_at: new Date().toISOString(),
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'SUBMIT_ACTION_RESULT',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'result',
      aggregate_id: resultId,
      payload: params,
      handler: async () => {
        this.mockResults.set(resultId, record);
        return {
          resultPayload: record,
          outboxEvent: {
            eventType: 'ACTION_RESULT_SUBMITTED',
            correlationId: plan.correlation_id,
            payload: { result_id: resultId, action_plan_id: plan.id, actual_value: params.actual_value },
          },
        };
      },
    });
  }

  /**
   * VERIFY_ACTION_RESULT
   */
  static async verifyResult(params: {
    command_id: string;
    result_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('VERIFY_ACTION_RESULT', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const result = this.mockResults.get(params.result_id);
    if (!result) throw new Error(`RESULT_NOT_FOUND: Result '${params.result_id}' does not exist.`);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'VERIFY_ACTION_RESULT',
      actor_user_id: params.actor_user_id,
      branch_id: result.branch_id,
      aggregate_type: 'result',
      aggregate_id: params.result_id,
      payload: params,
      handler: async () => {
        result.verification_status = 'VERIFIED';
        result.verified_by_user_id = params.actor_user_id;
        result.verified_at = new Date().toISOString();
        this.mockResults.set(params.result_id, result);

        const plan = ActionPlanService.getActionPlan(result.action_plan_id);
        if (plan) {
          plan.status = 'VERIFICATION';
        }

        return {
          resultPayload: result,
          outboxEvents: [
            {
              eventType: 'ACTION_RESULT_VERIFIED',
              correlationId: params.command_id,
              payload: { result_id: result.id, verified_by: params.actor_user_id },
            },
            {
              eventType: 'ACTION_PLAN_VERIFIED',
              correlationId: plan ? plan.correlation_id : params.command_id,
              payload: { action_plan_id: result.action_plan_id, status: 'VERIFICATION' },
            },
          ],
        };
      },
    });
  }

  /**
   * EVALUATE_ACTION_RESULT (Owner Only)
   */
  static async evaluateResult(params: {
    command_id: string;
    result_id: string;
    action_plan_id: string;
    business_id: string;
    branch_id: string;
    actor_user_id: string; // OWNER
    actor_role: ManagementRole;
    evaluation_outcome: 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'NOT_ACHIEVED';
    evaluation_notes: string;
  }) {
    const auth = ManagementAuthorization.authorize('EVALUATE_ACTION_RESULT', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const result = this.mockResults.get(params.result_id);
    if (!result) throw new Error(`RESULT_NOT_FOUND: Result '${params.result_id}' does not exist.`);

    // Enforce 4-column aggregate integrity
    if (
      result.action_plan_id !== params.action_plan_id ||
      result.business_id !== params.business_id ||
      result.branch_id !== params.branch_id
    ) {
      throw new Error('CROSS_AGGREGATE_VIOLATION: Evaluation context must strictly match Result aggregate context (result_id, action_plan_id, business_id, branch_id).');
    }

    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error('ACTION_PLAN_NOT_FOUND');

    const evalId = `eval-${params.command_id}`;
    const isNotAchieved = params.evaluation_outcome === 'NOT_ACHIEVED';
    const evalRecord: ActionResultEvaluationRecord = {
      id: evalId,
      action_plan_id: params.action_plan_id,
      business_id: params.business_id,
      branch_id: params.branch_id,
      result_id: params.result_id,
      evaluator_user_id: params.actor_user_id,
      evaluation_outcome: params.evaluation_outcome,
      evaluation_notes: params.evaluation_notes,
      corrective_action_recommended: isNotAchieved,
      evaluated_at: new Date().toISOString(),
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'EVALUATE_ACTION_RESULT',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'result',
      aggregate_id: evalId,
      payload: params,
      handler: async () => {
        this.mockEvaluations.set(evalId, evalRecord);
        plan.status = 'COMPLETED'; // Lifecycle complete

        return {
          resultPayload: evalRecord,
          outboxEvents: [
            {
              eventType: 'ACTION_RESULT_EVALUATED',
              correlationId: plan.correlation_id,
              causationEventId: params.command_id,
              payload: {
                evaluation_id: evalId,
                outcome: params.evaluation_outcome,
                corrective_action_recommended: isNotAchieved,
              },
            },
            {
              eventType: 'ACTION_PLAN_COMPLETED',
              correlationId: plan.correlation_id,
              causationEventId: params.command_id,
              payload: {
                action_plan_id: plan.id,
                status: 'COMPLETED',
                outcome: params.evaluation_outcome,
              },
            },
          ],
        };
      },
    });
  }
}
