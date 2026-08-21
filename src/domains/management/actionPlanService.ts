/**
 * MINARA BOS — ACTION PLAN DOMAIN SERVICE
 * 
 * Implements Action Plan lifecycle commands:
 * CREATE_ACTION_PLAN, SUBMIT_ACTION_PLAN, APPROVE_ACTION_PLAN, REJECT_ACTION_PLAN,
 * REQUEST_ACTION_PLAN_REVISION, ACTIVATE_ACTION_PLAN.
 */

import { ManagementStateMachine, ActionPlanStatus } from './managementStateMachine';
import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { DecisionService } from './decisionService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export interface ActionPlanRecord {
  id: string;
  business_id: string;
  branch_id: string;
  decision_id?: string;
  business_problem: string;
  business_reason: string;
  proposed_action: string;
  maker_user_id: string;
  approver_user_id?: string;
  accountable_owner_user_id: string;
  target_description: string;
  expected_result_description: string;
  expected_metric_name: string;
  baseline_value: number;
  target_value: number;
  metric_unit: string;
  priority: string;
  start_date: string;
  due_date: string;
  status: ActionPlanStatus;
  correlation_id: string;
  causation_event_id?: string;
  version_number: number;
}

export class ActionPlanService {
  private static mockActionPlans = new Map<string, ActionPlanRecord>();
  private static mockRevisions = new Map<string, any[]>();

  static clearStore() {
    this.mockActionPlans.clear();
    this.mockRevisions.clear();
  }

  static getActionPlan(id: string): ActionPlanRecord | undefined {
    return this.mockActionPlans.get(id);
  }

  /**
   * CREATE_ACTION_PLAN
   */
  static async createActionPlan(params: {
    command_id: string;
    business_id: string;
    branch_id: string;
    decision_id?: string;
    business_problem: string;
    business_reason: string;
    proposed_action: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    accountable_owner_user_id: string;
    target_description: string;
    expected_result_description: string;
    expected_metric_name: string;
    baseline_value: number;
    target_value: number;
    metric_unit: string;
    priority?: string;
    start_date: string;
    due_date: string;
    correlation_id: string;
    causation_event_id?: string;
  }) {
    // 1. Authorize role (Must be KEPALA_CABANG)
    const auth = ManagementAuthorization.authorize('CREATE_ACTION_PLAN', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    // 2. Validate Decision Scope if linked to a Decision
    if (params.decision_id) {
      const decision = DecisionService.getDecision(params.decision_id);
      if (decision) {
        if (decision.business_id !== params.business_id) {
          throw new Error('CROSS_TENANT_VIOLATION: Action Plan business_id must match Decision business_id.');
        }
        // Branch-scoped Decision check
        if (decision.branch_id && decision.branch_id !== params.branch_id) {
          throw new Error(`CROSS_BRANCH_SCOPE_VIOLATION: Branch-scoped Decision (${decision.branch_id}) cannot generate Action Plan for another branch (${params.branch_id}).`);
        }
      }
    }

    // 3. Validate due_date >= start_date
    if (new Date(params.due_date) < new Date(params.start_date)) {
      throw new Error('INVALID_DATE_RANGE: due_date must be greater than or equal to start_date.');
    }

    const actionPlanId = `ap-${params.command_id}`;
    const record: ActionPlanRecord = {
      id: actionPlanId,
      business_id: params.business_id,
      branch_id: params.branch_id,
      decision_id: params.decision_id,
      business_problem: params.business_problem,
      business_reason: params.business_reason,
      proposed_action: params.proposed_action,
      maker_user_id: params.actor_user_id,
      accountable_owner_user_id: params.accountable_owner_user_id,
      target_description: params.target_description,
      expected_result_description: params.expected_result_description,
      expected_metric_name: params.expected_metric_name,
      baseline_value: params.baseline_value,
      target_value: params.target_value,
      metric_unit: params.metric_unit,
      priority: params.priority || 'MEDIUM',
      start_date: params.start_date,
      due_date: params.due_date,
      status: 'DRAFT',
      correlation_id: params.correlation_id,
      causation_event_id: params.causation_event_id,
      version_number: 1,
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'CREATE_ACTION_PLAN',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: actionPlanId,
      payload: params,
      handler: async () => {
        this.mockActionPlans.set(actionPlanId, record);
        return {
          resultPayload: record,
          outboxEvent: {
            eventType: 'ACTION_PLAN_CREATED',
            correlationId: params.correlation_id,
            causationEventId: params.causation_event_id,
            payload: { action_plan_id: actionPlanId, maker: params.actor_user_id, status: 'DRAFT' },
          },
        };
      },
    });
  }

  /**
   * SUBMIT_ACTION_PLAN
   */
  static async submitActionPlan(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('SUBMIT_ACTION_PLAN', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = this.mockActionPlans.get(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'SUBMITTED');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'SUBMIT_ACTION_PLAN',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.status = 'SUBMITTED';
        this.mockActionPlans.set(params.action_plan_id, plan);

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_SUBMITTED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, status: 'SUBMITTED' },
          },
        };
      },
    });
  }

  /**
   * APPROVE_ACTION_PLAN
   */
  static async approveActionPlan(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string; // OWNER
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('APPROVE_ACTION_PLAN', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = this.mockActionPlans.get(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    // Assert Maker != Approver
    const makerCheck = ManagementAuthorization.assertMakerNotApprover(plan.maker_user_id, params.actor_user_id);
    if (!makerCheck.isValid) throw new Error(makerCheck.reason);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'APPROVED');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'APPROVE_ACTION_PLAN',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.status = 'APPROVED';
        plan.approver_user_id = params.actor_user_id;
        this.mockActionPlans.set(params.action_plan_id, plan);

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_APPROVED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, approved_by: params.actor_user_id, status: 'APPROVED' },
          },
        };
      },
    });
  }

  /**
   * REQUEST_ACTION_PLAN_REVISION
   */
  static async requestRevision(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    revision_reason: string;
  }) {
    const auth = ManagementAuthorization.authorize('REQUEST_ACTION_PLAN_REVISION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = this.mockActionPlans.get(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'DRAFT');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'REQUEST_ACTION_PLAN_REVISION',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.version_number += 1;
        plan.status = 'DRAFT';
        this.mockActionPlans.set(params.action_plan_id, plan);

        // Store immutable revision snapshot
        const revisions = this.mockRevisions.get(params.action_plan_id) || [];
        revisions.push({
          version_number: plan.version_number,
          requested_by: params.actor_user_id,
          reason: params.revision_reason,
          snapshot: { ...plan },
        });
        this.mockRevisions.set(params.action_plan_id, revisions);

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_REVISION_REQUESTED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, revision_reason: params.revision_reason, new_version: plan.version_number },
          },
        };
      },
    });
  }

  /**
   * ACTIVATE_ACTION_PLAN
   */
  static async activateActionPlan(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('ACTIVATE_ACTION_PLAN', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = this.mockActionPlans.get(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'ACTIVE');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'ACTIVATE_ACTION_PLAN',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.status = 'ACTIVE';
        this.mockActionPlans.set(params.action_plan_id, plan);

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_ACTIVATED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, status: 'ACTIVE' },
          },
        };
      },
    });
  }

  /**
   * REJECT_ACTION_PLAN
   */
  static async rejectActionPlan(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    rejection_reason: string;
  }) {
    const auth = ManagementAuthorization.authorize('REJECT_ACTION_PLAN', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = this.mockActionPlans.get(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    const sm = ManagementStateMachine.validateActionPlanTransition(plan.status, 'REJECTED');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'REJECT_ACTION_PLAN',
      actor_user_id: params.actor_user_id,
      branch_id: plan.branch_id,
      aggregate_type: 'action_plan',
      aggregate_id: params.action_plan_id,
      payload: params,
      handler: async () => {
        plan.status = 'REJECTED';
        this.mockActionPlans.set(params.action_plan_id, plan);

        return {
          resultPayload: plan,
          outboxEvent: {
            eventType: 'ACTION_PLAN_REJECTED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, status: 'REJECTED', rejection_reason: params.rejection_reason },
          },
        };
      },
    });
  }
}
