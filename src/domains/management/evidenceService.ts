/**
 * MINARA BOS — EVIDENCE DOMAIN SERVICE (PHASE 6 STEP 6-V)
 * 
 * Implements Management Evidence & Storage Flow:
 * File validation, private storage rules, submission authorization, short-lived signed URLs (600s),
 * Owner-only verification with Maker self-verification guards, rejection & resubmission,
 * verified evidence immutability, and atomic concurrency guards.
 */

import { ManagementAuthorization, ManagementRole } from './managementAuthorization';
import { ActionPlanService } from './actionPlanService';
import { AssignmentService } from './assignmentService';
import { CommandExecutor } from '../../services/command/commandExecutor';

export interface EvidenceRecord {
  id: string;
  action_plan_id: string;
  business_id: string;
  branch_id: string;
  submitted_by_user_id: string;
  evidence_type: string;
  storage_reference: string;
  description: string;
  verification_state: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  verified_by_user_id?: string;
  submitted_at: string;
  verified_at?: string;
  rejection_reason?: string;
  previous_evidence_id?: string;
}

export interface FileValidationInput {
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path?: string;
}

export class EvidenceService {
  private static mockEvidences = new Map<string, EvidenceRecord>();
  public static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  public static readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  public static readonly MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
  public static readonly SIGNED_URL_TTL_SECONDS = 600; // 600s max

  static clearStore() {
    this.mockEvidences.clear();
  }

  static getEvidence(id: string): EvidenceRecord | undefined {
    return this.mockEvidences.get(id);
  }

  /**
   * Validates file upload parameters before accepting evidence
   */
  static validateFile(input: FileValidationInput): { isValid: boolean; errorCode?: string; reason?: string } {
    // 1. Empty file check
    if (input.size_bytes <= 0) {
      return { isValid: false, errorCode: 'EMPTY_FILE', reason: 'EMPTY_FILE_REJECTION: File size cannot be zero or negative.' };
    }

    // 2. Size limit check
    if (input.size_bytes > this.MAX_FILE_SIZE_BYTES) {
      return { isValid: false, errorCode: 'FILE_TOO_LARGE', reason: `FILE_SIZE_LIMIT: File size exceeds maximum allowed limit of ${this.MAX_FILE_SIZE_BYTES} bytes.` };
    }

    // 3. MIME type allowlist check
    if (!this.ALLOWED_MIME_TYPES.includes(input.mime_type)) {
      return { isValid: false, errorCode: 'INVALID_MIME', reason: `FILE_MIME_ALLOWLIST: MIME type '${input.mime_type}' is not allowed.` };
    }

    // 4. File extension allowlist check
    const ext = input.filename.substring(input.filename.lastIndexOf('.')).toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return { isValid: false, errorCode: 'INVALID_EXTENSION', reason: `FILE_EXTENSION_ALLOWLIST: File extension '${ext}' is not allowed.` };
    }

    // 5. Path traversal check
    if (input.storage_path && (input.storage_path.includes('../') || input.storage_path.includes('..\\'))) {
      return { isValid: false, errorCode: 'INVALID_STORAGE_PATH', reason: 'PATH_TRAVERSAL_BLOCK: Path traversal patterns (../) are prohibited.' };
    }

    return { isValid: true };
  }

  /**
   * SUBMIT_EVIDENCE
   */
  static async submitEvidence(params: {
    command_id: string;
    action_plan_id: string;
    business_id: string;
    branch_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    evidence_type: string;
    storage_reference: string;
    description: string;
    file_info?: FileValidationInput;
    previous_evidence_id?: string;
  }) {
    // 1. Authorize command
    const auth = ManagementAuthorization.authorize('SUBMIT_EVIDENCE', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    // 2. Fetch Action Plan & verify tenant / branch context
    const plan = ActionPlanService.getActionPlan(params.action_plan_id);
    if (!plan) throw new Error(`ACTION_PLAN_NOT_FOUND: Action Plan '${params.action_plan_id}' does not exist.`);

    if (plan.business_id !== params.business_id) {
      throw new Error(`CROSS_TENANT_ACCESS: Cross-tenant evidence submission denied (Plan business '${plan.business_id}' vs provided '${params.business_id}').`);
    }

    if (plan.branch_id !== params.branch_id) {
      throw new Error(`CROSS_BRANCH_ACCESS: Cross-branch evidence submission denied (Plan branch '${plan.branch_id}' vs provided '${params.branch_id}').`);
    }

    // 3. Verify executor assignment for PEGAWAI
    if (params.actor_role === 'PEGAWAI') {
      const activeAsg = AssignmentService.getActiveAssignment(params.action_plan_id, params.actor_user_id);
      if (!activeAsg) {
        throw new Error(`EVIDENCE_SUBMISSION_AUTHORIZATION: Executor '${params.actor_user_id}' is not actively assigned to Action Plan '${params.action_plan_id}'.`);
      }
    }

    // 4. Validate file if info provided
    if (params.file_info) {
      const fileVal = this.validateFile({ ...params.file_info, storage_path: params.storage_reference });
      if (!fileVal.isValid) throw new Error(fileVal.reason);
    } else {
      // Basic path traversal check on storage_reference
      if (params.storage_reference.includes('../') || params.storage_reference.includes('..\\')) {
        throw new Error('PATH_TRAVERSAL_BLOCK: Path traversal patterns (../) are prohibited.');
      }
    }

    // 5. Enforce Relative Path Format ({business_id}/{branch_id}/{action_plan_id}/{evidence_id}/{filename})
    if (params.storage_reference.startsWith('http://') || params.storage_reference.startsWith('https://')) {
      throw new Error('PRIVATE_BUCKET_ENFORCEMENT: storage_reference must contain relative path only. Signed URLs cannot be persisted in database.');
    }

    const expectedPathPrefix = `${params.business_id}/${params.branch_id}/${params.action_plan_id}/`;
    if (!params.storage_reference.startsWith(expectedPathPrefix)) {
      if (params.storage_reference.startsWith(`${params.business_id}/`)) {
        if (!params.storage_reference.startsWith(`${params.business_id}/${params.branch_id}/`)) {
          throw new Error('CROSS_BRANCH_STORAGE_PATH_BLOCK: Storage path branch mismatch.');
        }
        throw new Error('INVALID_STORAGE_PATH: Storage path structure does not match expected relative pattern.');
      } else {
        throw new Error('CROSS_TENANT_STORAGE_PATH_BLOCK: Storage path tenant mismatch.');
      }
    }

    const evidenceId = `evd-${params.command_id}`;
    const record: EvidenceRecord = {
      id: evidenceId,
      action_plan_id: params.action_plan_id,
      business_id: params.business_id,
      branch_id: params.branch_id,
      submitted_by_user_id: params.actor_user_id,
      evidence_type: params.evidence_type,
      storage_reference: params.storage_reference,
      description: params.description,
      verification_state: 'PENDING',
      submitted_at: new Date().toISOString(),
      previous_evidence_id: params.previous_evidence_id,
    };

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'SUBMIT_EVIDENCE',
      actor_user_id: params.actor_user_id,
      branch_id: params.branch_id,
      aggregate_type: 'evidence',
      aggregate_id: evidenceId,
      payload: params,
      handler: async () => {
        this.mockEvidences.set(evidenceId, record);
        return {
          resultPayload: record,
          outboxEvent: {
            eventType: 'EVIDENCE_SUBMITTED',
            correlationId: plan.correlation_id,
            payload: { evidence_id: evidenceId, action_plan_id: plan.id, previous_evidence_id: params.previous_evidence_id },
          },
        };
      },
    });
  }

  /**
   * VERIFY_EVIDENCE (Owner Only, with Self-Verification Guard & Atomic Concurrency)
   */
  static async verifyEvidence(params: {
    command_id: string;
    evidence_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }) {
    // 1. Authorize Owner role
    const auth = ManagementAuthorization.authorize('VERIFY_EVIDENCE', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    if (params.actor_role !== 'OWNER') {
      throw new Error('EVIDENCE_VERIFICATION_OWNER_ONLY: Only Owner is authorized to verify evidence.');
    }

    const evidence = this.mockEvidences.get(params.evidence_id);
    if (!evidence) throw new Error(`EVIDENCE_NOT_FOUND: Evidence '${params.evidence_id}' does not exist.`);

    // 2. Prevent Maker / Submitter Self-Verification
    if (evidence.submitted_by_user_id === params.actor_user_id) {
      throw new Error('MAKER_SELF_VERIFICATION_BLOCK: Evidence submitter cannot verify their own evidence.');
    }

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'VERIFY_EVIDENCE',
      actor_user_id: params.actor_user_id,
      branch_id: evidence.branch_id,
      aggregate_type: 'evidence',
      aggregate_id: params.evidence_id,
      payload: params,
      handler: async () => {
        // Immutability & State Check (CONCURRENT_VERIFICATION_GUARD)
        if (evidence.verification_state === 'VERIFIED') {
          throw new Error('VERIFIED_EVIDENCE_IMMUTABLE: Evidence is already verified and immutable.');
        }
        if (evidence.verification_state === 'REJECTED') {
          throw new Error('CONCURRENT_VERIFICATION_GUARD: Evidence has already been rejected by another verification operation.');
        }
        if (evidence.verification_state !== 'PENDING' && evidence.verification_state !== 'UNDER_REVIEW') {
          throw new Error('CONCURRENT_VERIFICATION_GUARD: Concurrent verification state conflict.');
        }

        evidence.verification_state = 'VERIFIED';
        evidence.verified_by_user_id = params.actor_user_id;
        evidence.verified_at = new Date().toISOString();
        this.mockEvidences.set(params.evidence_id, evidence);

        return {
          resultPayload: evidence,
          outboxEvent: {
            eventType: 'EVIDENCE_VERIFIED',
            correlationId: params.command_id,
            payload: { evidence_id: evidence.id, verified_by: params.actor_user_id },
          },
        };
      },
    });
  }

  /**
   * REJECT_EVIDENCE (Owner Only, Mandatory Rejection Reason & Atomic Concurrency)
   */
  static async rejectEvidence(params: {
    command_id: string;
    evidence_id: string;
    business_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
    rejection_reason: string;
  }) {
    const auth = ManagementAuthorization.authorize('REJECT_EVIDENCE', params.actor_role);
    if (!auth.isAuthorized) throw new Error(auth.reason);

    if (!params.rejection_reason || params.rejection_reason.trim() === '') {
      throw new Error('EVIDENCE_REJECTION_REQUIRES_REASON: Mandatory rejection_reason is missing.');
    }

    const evidence = this.mockEvidences.get(params.evidence_id);
    if (!evidence) throw new Error(`EVIDENCE_NOT_FOUND: Evidence '${params.evidence_id}' does not exist.`);

    return CommandExecutor.execute({
      business_id: params.business_id,
      command_id: params.command_id,
      command_name: 'REJECT_EVIDENCE',
      actor_user_id: params.actor_user_id,
      branch_id: evidence.branch_id,
      aggregate_type: 'evidence',
      aggregate_id: params.evidence_id,
      payload: params,
      handler: async () => {
        // Immutability Check inside handler to allow CommandExecutor idempotency interception
        if (evidence.verification_state === 'VERIFIED') {
          throw new Error('VERIFIED_EVIDENCE_IMMUTABLE: Verified evidence cannot be rejected.');
        }
        if (evidence.verification_state === 'REJECTED') {
          throw new Error('CONCURRENT_VERIFICATION_GUARD: Evidence has already been rejected.');
        }

        evidence.verification_state = 'REJECTED';
        evidence.rejection_reason = params.rejection_reason;
        this.mockEvidences.set(params.evidence_id, evidence);

        return {
          resultPayload: evidence,
          outboxEvent: {
            eventType: 'EVIDENCE_REJECTED',
            correlationId: params.command_id,
            payload: { evidence_id: evidence.id, rejection_reason: params.rejection_reason },
          },
        };
      },
    });
  }

  /**
   * Controlled service for generating short-lived signed URL (max 600s)
   */
  static getEvidenceSignedUrl(params: {
    evidence_id: string;
    business_id: string;
    branch_id: string;
    actor_user_id: string;
    actor_role: ManagementRole;
  }): { signedUrl: string; expires_in_seconds: number } {
    const evidence = this.mockEvidences.get(params.evidence_id);
    if (!evidence) throw new Error('EVIDENCE_NOT_FOUND');

    if (evidence.business_id !== params.business_id) {
      throw new Error('SIGNED_URL_ACCESS_DENIED: Cross-tenant signed URL access denied.');
    }

    if (evidence.branch_id !== params.branch_id && params.actor_role !== 'OWNER') {
      throw new Error('SIGNED_URL_ACCESS_DENIED: Cross-branch signed URL access denied.');
    }

    const expectedPathPrefix = `${evidence.business_id}/${evidence.branch_id}/${evidence.action_plan_id}/`;
    if (!evidence.storage_reference.startsWith(expectedPathPrefix)) {
      throw new Error('INVALID_STORAGE_PATH: Storage reference does not match expected relative path pattern.');
    }

    const expires = this.SIGNED_URL_TTL_SECONDS;
    const token = Buffer.from(`${params.actor_user_id}:${Date.now()}:${expires}`).toString('base64');
    const signedUrl = `https://supabase.local/storage/v1/object/sign/management-evidences/${evidence.storage_reference}?token=${token}`;

    return {
      signedUrl,
      expires_in_seconds: expires,
    };
  }

  /**
   * Immutability guard for verified evidence updates
   */
  static async updateVerifiedEvidence(evidenceId: string, newDescription: string) {
    const evidence = this.mockEvidences.get(evidenceId);
    if (!evidence) throw new Error('EVIDENCE_NOT_FOUND');
    if (evidence.verification_state === 'VERIFIED') {
      throw new Error('VERIFIED_EVIDENCE_IMMUTABILITY: Verified evidence fields are immutable.');
    }
    evidence.description = newDescription;
    this.mockEvidences.set(evidenceId, evidence);
  }

  /**
   * Simulates physical DELETE attempt to verify hard delete protection
   */
  static deleteEvidence(evidenceId: string) {
    throw new Error('HARD_DELETE_PROTECTION: Physical delete prohibited by MINARA BOS Phase 6 policy.');
  }
}
