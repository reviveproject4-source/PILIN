/**
 * MINARA BOS — PHASE 6 MANAGEMENT CONTROL STATE MACHINES
 * 
 * Defines explicit allowed state transitions and invariants for Decisions and Action Plans.
 */

export type DecisionStatus = 
  | 'PROPOSED' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'ACTIVE' 
  | 'EVALUATED' 
  | 'CLOSED' 
  | 'CANCELLED' 
  | 'SUPERSEDED';

export type ActionPlanStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'ACTIVE' 
  | 'IN_PROGRESS' 
  | 'SUBMITTED_FOR_RESULT' 
  | 'VERIFICATION' 
  | 'COMPLETED';

export class ManagementStateMachine {
  // Decision Allowed Transitions
  private static decisionTransitions: Record<DecisionStatus, DecisionStatus[]> = {
    PROPOSED: ['APPROVED', 'REJECTED', 'CANCELLED'],
    APPROVED: ['ACTIVE', 'CANCELLED'],
    REJECTED: [], // Terminal
    ACTIVE: ['EVALUATED', 'SUPERSEDED', 'CANCELLED'],
    EVALUATED: ['CLOSED', 'SUPERSEDED'],
    CLOSED: [], // Terminal
    CANCELLED: [], // Terminal
    SUPERSEDED: [], // Terminal
  };

  // Action Plan Allowed Transitions
  private static actionPlanTransitions: Record<ActionPlanStatus, ActionPlanStatus[]> = {
    DRAFT: ['SUBMITTED', 'REJECTED'],
    SUBMITTED: ['APPROVED', 'REJECTED', 'DRAFT'], // DRAFT = REVISION_REQUESTED
    APPROVED: ['ACTIVE', 'REJECTED'],
    REJECTED: [], // Terminal
    ACTIVE: ['IN_PROGRESS'],
    IN_PROGRESS: ['SUBMITTED_FOR_RESULT'],
    SUBMITTED_FOR_RESULT: ['VERIFICATION', 'IN_PROGRESS'], // IN_PROGRESS = REJECTED_RESULT
    VERIFICATION: ['COMPLETED', 'IN_PROGRESS'],
    COMPLETED: [], // Terminal
  };

  /**
   * Validates Decision State Transition
   */
  static validateDecisionTransition(current: DecisionStatus, target: DecisionStatus): { isValid: boolean; reason?: string } {
    const allowed = this.decisionTransitions[current];
    if (!allowed || !allowed.includes(target)) {
      return {
        isValid: false,
        reason: `INVALID_STATE_TRANSITION: Cannot move Decision from '${current}' to '${target}'. Allowed targets: [${(allowed || []).join(', ')}]`,
      };
    }
    return { isValid: true };
  }

  /**
   * Validates Action Plan State Transition
   */
  static validateActionPlanTransition(current: ActionPlanStatus, target: ActionPlanStatus): { isValid: boolean; reason?: string } {
    const allowed = this.actionPlanTransitions[current];
    if (!allowed || !allowed.includes(target)) {
      return {
        isValid: false,
        reason: `INVALID_STATE_TRANSITION: Cannot move Action Plan from '${current}' to '${target}'. Allowed targets: [${(allowed || []).join(', ')}]`,
      };
    }
    return { isValid: true };
  }
}
