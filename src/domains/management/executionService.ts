/**
 * MINARA BOS — EXECUTION DOMAIN SERVICE
 * 
 * Implements execution commands:
 * START_ACTION_PLAN, LOG_ACTION_PROGRESS, SUBMIT_ACTION_FOR_RESULT.
 */

import { ManagementStateMachine } from './managementStateMachine';
import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { ActionPlanService } from './actionPlanService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export class ExecutionService {
  private static latestProgress = new Map<string, number>();

  static clearStore() {
    this.latestProgress.clear();
  }

  /**
   * START_ACTION_PLAN
   */
  static async startActionPlan(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('START_ACTION_PLAN', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'IN_PROGRESS');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'START_ACTION_PLAN',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.status = 'IN_PROGRESS';
        this.latestProgress.set(params.action_plan_id, 0);

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_STARTED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, status: 'IN_PROGRESS' },
          },
        };
      },
    });
  }

  /**
   * LOG_ACTION_PROGRESS
   */
  static async logProgress(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    progress_percent: number;
    notes?: string;
    blocker_reason?: string;
  }) {
    const auth = ManagementAuthorization.authorize('LOG_ACTION_PROGRESS', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    if (params.progress_percent < 0 || params.progress_percent > 100) {
      throw new Error('INVALID_PROGRESS_RANGE: progress_percent must be between 0 and 100.');
    }

    const currentProg = this.latestProgress.get(params.action_plan_id) || 0;
    if (params.progress_percent < currentProg) {
      throw new Error(`PROGRESS_BACKWARD_VIOLATION: Progress cannot decrease from ${currentProg}% to ${params.progress_percent}%.`);
    }

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'LOG_ACTION_PROGRESS',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        this.latestProgress.set(params.action_plan_id, params.progress_percent);

        return {
          resultPayload: { action_plan_id: plan.id, progress_percent: params.progress_percent, notes: params.notes },
          outboxEvent: {
            eventType: 'ACTION_PROGRESS_LOGGED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, progress_percent: params.progress_percent },
          },
        };
      },
    });
  }

  /**
   * SUBMIT_ACTION_FOR_RESULT
   */
  static async submitForResult(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('SUBMIT_ACTION_FOR_RESULT', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'SUBMITTED_FOR_RESULT');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'SUBMIT_ACTION_FOR_RESULT',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.status = 'SUBMITTED_FOR_RESULT';

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_SUBMITTED_FOR_RESULT',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, status: 'SUBMITTED_FOR_RESULT' },
          },
        };
      },
    });
  }
}
