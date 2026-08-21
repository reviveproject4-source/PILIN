/**
 * MINARA BOS — DECISION DOMAIN SERVICE
 * 
 * Implements decision lifecycle management commands:
 * CREATE_DECISION, APPROVE_DECISION, REJECT_DECISION, ACTIVATE_DECISION, SUPERSEDE_DECISION, CLOSE_DECISION.
 */

import { ManagementStateMachine, DecisionStatus } from './managementStateMachine';
import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { CommandExecutor } from '../../services/command/commandExecutor';

export interface DecisionRecord {
  id: string;
  business_id: string;
  branch_id?: string;
  decision_type: string;
  title: string;
  business_reason: string;
  source_insight_signal_ref?: string;
  decision_owner_user_id: string;
  approved_by_user_id?: string;
  status: DecisionStatus;
  superseded_by_decision_id?: string;
  correlation_id: string;
}

export class DecisionService {
  private static mockDecisions = new Map<string, DecisionRecord>();

  static clearStore() {
    this.mockDecisions.clear();
  }

  static getDecision(id: string): DecisionRecord | undefined {
    return this.mockDecisions.get(id);
  }

  /**
   * CREATE_DECISION
   */
  static async createDecision(params: {
    command_id: string;
    business_id: string;
    branch_id?: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    decision_type: string;
    title: string;
    business_reason: string;
    source_insight_signal_ref?: string;
    correlation_id: string;
  }) {
    const auth = ManagementAuthorization.authorize('CREATE_DECISION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const decisionId = `dec-${params.command_id}`;
    const record: DecisionRecord = {
      id: decisionId,
      business_id: params.business_id,
      branch_id: params.branch_id,
      decision_type: params.decision_type,
      title: params.title,
      business_reason: params.business_reason,
      source_insight_signal_ref: params.source_insight_signal_ref,
      decision_owner_user_id: params.actor_user_id,
      status: 'PROPOSED',
      correlation_id: params.correlation_id,
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'CREATE_DECISION',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'decision',
      aggregate_id: decisionId,
      payload: params,
      handler: async () => {
        this.mockDecisions.set(decisionId, record);
        return {
          resultPayload: record,
          outboxEvent: {
            eventType: 'DECISION_CREATED',
            correlationId: params.correlation_id,
            payload: { decision_id: decisionId, status: 'PROPOSED', title: params.title },
          },
        };
      },
    });
  }

  /**
   * APPROVE_DECISION
   */
  static async approveDecision(params: {
    command_id: string;
    decision_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('APPROVE_DECISION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const decision = this.mockDecisions.get(params.decision_id);
    if (!decision) throw new Error(`DECISION_NOT_FOUND: Decision '${params.decision_id}' does not exist.`);
    if (decision.business_id !== params.business_id) throw new Error('CROSS_TENANT_VIOLATION: Tenant mismatch.');

    // A decision owner cannot approve their own decision
    if (decision.decision_owner_user_id === params.actor_user_id) {
      throw new Error('SELF_APPROVAL_VIOLATION: A decision creator cannot approve their own decision.');
    }

    const sm = ManagementStateMachine.validateDecisionTransition(decision.status, 'APPROVED');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'APPROVE_DECISION',
      actor_user_id: params.actor_user_id,
      branch_id: decision.branch_id,
      aggregate_type: 'decision',
      aggregate_id: params.decision_id,
      payload: params,
      handler: async () => {
        decision.status = 'APPROVED';
        decision.approved_by_user_id = params.actor_user_id;
        this.mockDecisions.set(params.decision_id, decision);

        return {
          resultPayload: decision,
          outboxEvent: {
            eventType: 'DECISION_APPROVED',
            correlationId: decision.correlation_id,
            payload: { decision_id: decision.id, approved_by: params.actor_user_id, status: 'APPROVED' },
          },
        };
      },
    });
  }

  /**
   * ACTIVATE_DECISION
   */
  static async activateDecision(params: {
    command_id: string;
    decision_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('ACTIVATE_DECISION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const decision = this.mockDecisions.get(params.decision_id);
    if (!decision) throw new Error(`DECISION_NOT_FOUND: Decision '${params.decision_id}' does not exist.`);

    const sm = ManagementStateMachine.validateDecisionTransition(decision.status, 'ACTIVE');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'ACTIVATE_DECISION',
      actor_user_id: params.actor_user_id,
      branch_id: decision.branch_id,
      aggregate_type: 'decision',
      aggregate_id: params.decision_id,
      payload: params,
      handler: async () => {
        decision.status = 'ACTIVE';
        this.mockDecisions.set(params.decision_id, decision);

        return {
          resultPayload: decision,
          outboxEvent: {
            eventType: 'DECISION_ACTIVATED',
            correlationId: decision.correlation_id,
            payload: { decision_id: decision.id, status: 'ACTIVE' },
          },
        };
      },
    });
  }

  /**
   * REJECT_DECISION
   */
  static async rejectDecision(params: {
    command_id: string;
    decision_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    rejection_reason: string;
  }) {
    const auth = ManagementAuthorization.authorize('REJECT_DECISION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const decision = this.mockDecisions.get(params.decision_id);
    if (!decision) throw new Error(`DECISION_NOT_FOUND: Decision '${params.decision_id}' does not exist.`);

    const sm = ManagementStateMachine.validateDecisionTransition(decision.status, 'REJECTED');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'REJECT_DECISION',
      actor_user_id: params.actor_user_id,
      branch_id: decision.branch_id,
      aggregate_type: 'decision',
      aggregate_id: params.decision_id,
      payload: params,
      handler: async () => {
        decision.status = 'REJECTED';
        this.mockDecisions.set(params.decision_id, decision);

        return {
          resultPayload: decision,
          outboxEvent: {
            eventType: 'DECISION_REJECTED',
            correlationId: decision.correlation_id,
            payload: { decision_id: decision.id, rejection_reason: params.rejection_reason },
          },
        };
      },
    });
  }

  /**
   * SUPERSEDE_DECISION
   */
  static async supersedeDecision(params: {
    command_id: string;
    decision_id: string;
    superseded_by_decision_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('SUPERSEDE_DECISION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const decision = this.mockDecisions.get(params.decision_id);
    const newDecision = this.mockDecisions.get(params.superseded_by_decision_id);

    if (!decision || !newDecision) throw new Error('DECISION_NOT_FOUND: Target or superseding decision does not exist.');
    if (decision.business_id !== params.business_id || newDecision.business_id !== params.business_id) {
      throw new Error('CROSS_TENANT_VIOLATION: Supersession must occur within the same tenant.');
    }

    const sm = ManagementStateMachine.validateDecisionTransition(decision.status, 'SUPERSEDED');
    if (!sm.isValid) throw new Error(sm.reason);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'SUPERSEDE_DECISION',
      actor_user_id: params.actor_user_id,
      branch_id: decision.branch_id,
      aggregate_type: 'decision',
      aggregate_id: params.decision_id,
      payload: params,
      handler: async () => {
        decision.status = 'SUPERSEDED';
        decision.superseded_by_decision_id = params.superseded_by_decision_id;
        this.mockDecisions.set(params.decision_id, decision);

        return {
          resultPayload: decision,
          outboxEvent: {
            eventType: 'DECISION_SUPERSEDED',
            correlationId: decision.correlation_id,
            payload: { decision_id: decision.id, superseded_by: params.superseded_by_decision_id },
          },
        };
      },
    });
  }
}
