/**
 * MINARA BOS — CORRECTIVE ACTION DOMAIN SERVICE
 * 
 * Implements: CREATE_CORRECTIVE_ACTION.
 * Preserves causal lineage to previous evaluation event without silently overwriting the original Action Plan.
 */

import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { ActionPlanService } from './actionPlanService';
import { ResultService } from './resultService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export class CorrectiveActionService {
  /**
   * CREATE_CORRECTIVE_ACTION
   */
  static async createCorrectiveAction(params: {
    command_id: string;
    source_evaluation_id: string;
    business_id: string;
    branch_id: string;
    actor_user_id: string; // KEPALA_CABANG (Maker)
    actor_role: ManagementRole;
    business_problem: string;
    business_reason: string;
    proposed_action: string;
    accountable_owner_user_id: string;
    target_description: string;
    expected_result_description: string;
    expected_metric_name: string;
    baseline_value: number;
    target_value: number;
    metric_unit: string;
    start_date: string;
    due_date: string;
  }) {
    const auth = ManagementAuthorization.authorize('CREATE_CORRECTIVE_ACTION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const evaluation = ResultService.getEvaluation(params.source_evaluation_id);
    if (!evaluation) {
      throw new Error(`EVALUATION_NOT_FOUND: Source evaluation '${params.source_evaluation_id}' does not exist.`);
    }

    if (evaluation.evaluation_outcome !== 'NOT_ACHIEVED' && !evaluation.corrective_action_recommended) {
      throw new Error('INVALID_CORRECTIVE_ACTION_TRIGGER: Corrective Action can only be created for evaluation outcome NOT_ACHIEVED.');
    }

    const originalPlan = ActionPlanService.getActionPlan(evaluation.action_plan_id);
    const correlationId = originalPlan ? originalPlan.correlation_id : `corr-${params.command_id}`;
    const causationEventId = `evt-${params.source_evaluation_id}`;

    // Create standard Action Plan with causation lineage
    const actionPlanResult = await ActionPlanService.createActionPlan({
      command_id: params.command_id,
      business_id: params.business_id,
      branch_id: params.branch_id,
      decision_id: originalPlan?.decision_id,
      business_problem: params.business_problem,
      business_reason: params.business_reason,
      proposed_action: params.proposed_action,
      actor_user_id: params.actor_user_id,
      actor_role: params.actor_role,
      accountable_owner_user_id: params.accountable_owner_user_id,
      target_description: params.target_description,
      expected_result_description: params.expected_result_description,
      expected_metric_name: params.expected_metric_name,
      baseline_value: params.baseline_value,
      target_value: params.target_value,
      metric_unit: params.metric_unit,
      priority: 'HIGH',
      start_date: params.start_date,
      due_date: params.due_date,
      correlation_id: correlationId,
      causation_event_id: causationEventId,
    });

    // Also emit CORRECTIVE_ACTION_CREATED event
    await CommandExecutor.execute({
      business_id: params.business_id,
      command_id: `ca-${params.command_id}`,
      command_name: 'CREATE_CORRECTIVE_ACTION',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: actionPlanResult.data.id,
      payload: { ...params, created_action_plan_id: actionPlanResult.data.id },
      handler: async () => {
        return {
          resultPayload: actionPlanResult.data,
          outboxEvent: {
            eventType: 'CORRECTIVE_ACTION_CREATED',
            correlationId: correlationId,
            causationEventId: causationEventId,
            payload: {
              corrective_action_plan_id: actionPlanResult.data.id,
              source_evaluation_id: params.source_evaluation_id,
            },
          },
        };
      },
    });

    return actionPlanResult;
  }
}
