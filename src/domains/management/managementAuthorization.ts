/**
 * MINARA BOS — PHASE 6 MANAGEMENT AUTHORIZATION MATRIX
 * 
 * Enforces explicit command-level authorization for OWNER, KEPALA_CABANG, and PEGAWAI.
 */

export type ManagementRole = 'OWNER' | 'KEPALA_CABANG' | 'PEGAWAI';

export type ManagementCommandName =
  | 'CREATE_DECISION'
  | 'APPROVE_DECISION'
  | 'REJECT_DECISION'
  | 'ACTIVATE_DECISION'
  | 'SUPERSEDE_DECISION'
  | 'CLOSE_DECISION'
  | 'CREATE_ACTION_PLAN'
  | 'SUBMIT_ACTION_PLAN'
  | 'APPROVE_ACTION_PLAN'
  | 'REJECT_ACTION_PLAN'
  | 'REQUEST_ACTION_PLAN_REVISION'
  | 'ACTIVATE_ACTION_PLAN'
  | 'ASSIGN_ACTION'
  | 'REASSIGN_ACTION'
  | 'RELEASE_ACTION_ASSIGNMENT'
  | 'START_ACTION_PLAN'
  | 'LOG_ACTION_PROGRESS'
  | 'SUBMIT_ACTION_FOR_RESULT'
  | 'SUBMIT_EVIDENCE'
  | 'VERIFY_EVIDENCE'
  | 'REJECT_EVIDENCE'
  | 'SUBMIT_ACTION_RESULT'
  | 'VERIFY_ACTION_RESULT'
  | 'EVALUATE_ACTION_RESULT'
  | 'CREATE_CORRECTIVE_ACTION';

export class ManagementAuthorization {
  private static matrix: Record<ManagementCommandName, ManagementRole[]> = {
    CREATE_DECISION: ['OWNER', 'KEPALA_CABANG'],
    APPROVE_DECISION: ['OWNER'],
    REJECT_DECISION: ['OWNER'],
    ACTIVATE_DECISION: ['OWNER'],
    SUPERSEDE_DECISION: ['OWNER'],
    CLOSE_DECISION: ['OWNER'],
    CREATE_ACTION_PLAN: ['KEPALA_CABANG'], // Sole Maker
    SUBMIT_ACTION_PLAN: ['KEPALA_CABANG'],
    APPROVE_ACTION_PLAN: ['OWNER'], // Approver
    REJECT_ACTION_PLAN: ['OWNER'],
    REQUEST_ACTION_PLAN_REVISION: ['OWNER'],
    ACTIVATE_ACTION_PLAN: ['OWNER'],
    ASSIGN_ACTION: ['OWNER', 'KEPALA_CABANG'],
    REASSIGN_ACTION: ['OWNER', 'KEPALA_CABANG'],
    RELEASE_ACTION_ASSIGNMENT: ['OWNER', 'KEPALA_CABANG'],
    START_ACTION_PLAN: ['PEGAWAI', 'KEPALA_CABANG'],
    LOG_ACTION_PROGRESS: ['PEGAWAI', 'KEPALA_CABANG'],
    SUBMIT_ACTION_FOR_RESULT: ['PEGAWAI', 'KEPALA_CABANG'],
    SUBMIT_EVIDENCE: ['PEGAWAI', 'KEPALA_CABANG'],
    VERIFY_EVIDENCE: ['OWNER'],
    REJECT_EVIDENCE: ['OWNER'],
    SUBMIT_ACTION_RESULT: ['KEPALA_CABANG', 'PEGAWAI'],
    VERIFY_ACTION_RESULT: ['OWNER'],
    EVALUATE_ACTION_RESULT: ['OWNER'],
    CREATE_CORRECTIVE_ACTION: ['KEPALA_CABANG'],
  };

  /**
   * Authorizes actor role against requested command
   */
  static authorize(command: ManagementCommandName, role: ManagementRole): { isAuthorized: boolean; reason?: string } {
    const allowedRoles = this.matrix[command];
    if (!allowedRoles || !allowedRoles.includes(role)) {
      return {
        isAuthorized: false,
        reason: `UNAUTHORIZED_COMMAND: Role '${role}' is not authorized to execute command '${command}'. Required roles: [${(allowedRoles || []).join(', ')}]`,
      };
    }
    return { isAuthorized: true };
  }

  /**
   * Enforces Maker != Approver rule
   */
  static assertMakerNotApprover(makerUserId: string, approverUserId: string): { isValid: boolean; reason?: string } {
    if (makerUserId === approverUserId) {
      return {
        isValid: false,
        reason: 'MAKER_APPROVER_CONFLICT: Action Plan maker cannot be the approver (Maker != Approver enforced).',
      };
    }
    return { isValid: true };
  }
}
