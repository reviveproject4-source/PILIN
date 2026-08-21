/**
 * MINARA BOS — ASSIGNMENT DOMAIN SERVICE
 * 
 * Implements execution assignment commands:
 * ASSIGN_ACTION, REASSIGN_ACTION, RELEASE_ACTION_ASSIGNMENT.
 */

import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { ActionPlanService } from './actionPlanService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export interface AssignmentRecord {
  id: string;
  action_plan_id: string;
  business_id: string;
  branch_id: string;
  assigned_executor_user_id: string;
  status: 'ASSIGNED' | 'REASSIGNED' | 'RELEASED';
  assigned_by_user_id: string;
  assigned_at: string;
  released_at?: string;
}

export class AssignmentService {
  private static mockAssignments = new Map<string, AssignmentRecord>();

  static clearStore() {
    this.mockAssignments.clear();
  }

  static getActiveAssignment(actionPlanId: string, executorId: string): AssignmentRecord | undefined {
    return Array.from(this.mockAssignments.values()).find(
      (a) => a.action_plan_id === actionPlanId && a.assigned_executor_user_id === executorId && a.status === 'ASSIGNED'
    );
  }

  /**
   * ASSIGN_ACTION
   */
  static async assignAction(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    branch_id: string;
    assigned_executor_user_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('ASSIGN_ACTION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    // Assert no duplicate active assignment for same executor
    const existingActive = this.getActiveAssignment(params.action_plan_id, params.assigned_executor_user_id);
    if (existingActive) {
      throw new Error(`DUPLICATE_ACTIVE_ASSIGNMENT: Executor '${params.assigned_executor_user_id}' is already actively assigned to Action Plan '${params.action_plan_id}'.`);
    }

    const assignmentId = `asg-${params.command_id}`;
    const record: AssignmentRecord = {
      id: assignmentId,
      action_plan_id: params.action_plan_id,
      business_id: params.business_id,
      branch_id: params.branch_id,
      assigned_executor_user_id: params.assigned_executor_user_id,
      status: 'ASSIGNED',
      assigned_by_user_id: params.actor_user_id,
      assigned_at: new Date().toISOString(),
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'ASSIGN_ACTION',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'assignment',
      aggregate_id: assignmentId,
      payload: params,
      handler: async () => {
        this.mockAssignments.set(assignmentId, record);
        return {
          resultPayload: record,
          outboxEvent: {
            eventType: 'ACTION_ASSIGNED',
            correlationId: plan.correlation_id,
            payload: { action_plan_id: plan.id, executor: params.assigned_executor_user_id },
          },
        };
      },
    });
  }

  /**
   * REASSIGN_ACTION
   */
  static async reassignAction(params: {
    command_id: string;
    assignment_id: string;
    new_executor_user_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('REASSIGN_ACTION', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const oldAssignment = this.mockAssignments.get(params.assignment_id);
    if (!oldAssignment) throw new Error(`ASSIGNMENT_NOT_FOUND: Assignment '${params.assignment_id}' does not exist.`);

    const newAssignmentId = `asg-${params.command_id}`;
    const newRecord: AssignmentRecord = {
      id: newAssignmentId,
      action_plan_id: oldAssignment.action_plan_id,
      business_id: params.business_id,
      branch_id: oldAssignment.branch_id,
      assigned_executor_user_id: params.new_executor_user_id,
      status: 'ASSIGNED',
      assigned_by_user_id: params.actor_user_id,
      assigned_at: new Date().toISOString(),
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'REASSIGN_ACTION',
      actor_user_id: params.actor_user_id,
      branch_id: oldAssignment.branch_id,
      aggregate_type: 'assignment',
      aggregate_id: newAssignmentId,
      payload: params,
      handler: async () => {
        oldAssignment.status = 'REASSIGNED';
        oldAssignment.released_at = new Date().toISOString();
        this.mockAssignments.set(params.assignment_id, oldAssignment);
        this.mockAssignments.set(newAssignmentId, newRecord);

        return {
          resultPayload: newRecord,
          outboxEvent: {
            eventType: 'ACTION_REASSIGNED',
            correlationId: params.command_id,
            payload: {
              previous_assignment_id: params.assignment_id,
              new_assignment_id: newAssignmentId,
              previous_executor: oldAssignment.assigned_executor_user_id,
              new_executor: params.new_executor_user_id,
            },
          },
        };
      },
    });
  }

  /**
   * RELEASE_ACTION_ASSIGNMENT
   */
  static async releaseAssignment(params: {
    command_id: string;
    assignment_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    const auth = ManagementAuthorization.authorize('RELEASE_ACTION_ASSIGNMENT', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    const assignment = this.mockAssignments.get(params.assignment_id);
    if (!assignment) throw new Error(`ASSIGNMENT_NOT_FOUND: Assignment '${params.assignment_id}' does not exist.`);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'RELEASE_ACTION_ASSIGNMENT',
      actor_user_id: params.actor_user_id,
      branch_id: assignment.branch_id,
      aggregate_type: 'assignment',
      aggregate_id: params.assignment_id,
      payload: params,
      handler: async () => {
        assignment.status = 'RELEASED';
        assignment.released_at = new Date().toISOString();
        this.mockAssignments.set(params.assignment_id, assignment);

        return {
          resultPayload: assignment,
          outboxEvent: {
            eventType: 'ACTION_RELEASED',
            correlationId: params.command_id,
            payload: { assignment_id: assignment.id, executor: assignment.assigned_executor_user_id },
          },
        };
      },
    });
  }
}
