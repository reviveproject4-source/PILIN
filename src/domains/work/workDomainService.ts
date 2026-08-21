import { 
  ServiceOrder, 
  ServiceOrderStatus, 
  Job, 
  JobStatus, 
  QCStatus, 
  SLAStatus, 
  Delivery, 
  PriorityLevel 
} from '@/lib/types';
import { AuditLogger } from '../control/auditLogger';

export interface BusinessEventContract {
  event_id: string;
  event_type: string;
  event_version: number;
  occurred_at: string;
  business_id: string;
  branch_id: string;
  actor_id: string;
  aggregate_type: 'service_order' | 'job' | 'delivery';
  aggregate_id: string;
  correlation_id: string;
  causation_id: string;
  payload: Record<string, any>;
}

export interface CommandIdempotencyRecord {
  business_id: string;
  command_id: string;
  command_name: string;
  executed_at: string;
  result_summary: string;
}

export class WorkDomainService {
  private static idempotencyCache = new Set<string>();
  private static outboxEvents: BusinessEventContract[] = [];

  /**
   * Enforces Service Order State Machine Server-Side (Section 7 & 12)
   */
  static validateServiceOrderTransition(
    currentStatus: ServiceOrderStatus,
    targetStatus: ServiceOrderStatus
  ): { isValid: boolean; reason?: string } {
    if (currentStatus === targetStatus) return { isValid: true };

    const validTransitions: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
      RECEIVED: ['DIAGNOSIS', 'ESTIMATE', 'CANCELLED'],
      DIAGNOSIS: ['ESTIMATE', 'CANCELLED'],
      ESTIMATE: ['WAITING_APPROVAL', 'REJECTED', 'CANCELLED'],
      WAITING_APPROVAL: ['APPROVED', 'REJECTED', 'CANCELLED'],
      APPROVED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['ON_HOLD', 'QC', 'CANCELLED'],
      ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
      QC: ['READY_FOR_PICKUP', 'IN_PROGRESS', 'CANCELLED'],
      READY_FOR_PICKUP: ['DELIVERED', 'CANCELLED'],
      DELIVERED: ['CLOSED'],
      CLOSED: [],
      REJECTED: [],
      CANCELLED: []
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        isValid: false,
        reason: `Invalid Service Order status transition from ${currentStatus} to ${targetStatus}.`
      };
    }

    return { isValid: true };
  }

  /**
   * Enforces Job State Machine & QC Gate Server-Side (Section 12 & 16)
   */
  static validateJobTransition(
    currentStatus: JobStatus,
    targetStatus: JobStatus,
    hasPassedQC: boolean = false
  ): { isValid: boolean; reason?: string } {
    if (currentStatus === targetStatus) return { isValid: true };

    // Mandatory QC Gate: Job cannot become COMPLETED unless QC has passed
    if (targetStatus === 'COMPLETED' && !hasPassedQC) {
      return {
        isValid: false,
        reason: 'QC GATE REJECTION: Job cannot be marked COMPLETED without a PASSED QC inspection.'
      };
    }

    const validTransitions: Record<JobStatus, JobStatus[]> = {
      QUEUED: ['ASSIGNED', 'ON_HOLD'],
      ASSIGNED: ['IN_PROGRESS', 'QUEUED', 'ON_HOLD'],
      IN_PROGRESS: ['READY_FOR_QC', 'ON_HOLD'],
      ON_HOLD: ['IN_PROGRESS', 'ASSIGNED', 'QUEUED'],
      READY_FOR_QC: ['QC', 'IN_PROGRESS'],
      QC: ['COMPLETED', 'REWORK'],
      REWORK: ['IN_PROGRESS', 'ASSIGNED'],
      COMPLETED: []
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      return {
        isValid: false,
        reason: `Invalid Job status transition from ${currentStatus} to ${targetStatus}.`
      };
    }

    return { isValid: true };
  }

  /**
   * Calculates SLA Status using Elapsed Business Time & Hold Rules (Section 19 & 20)
   */
  static calculateSLA(
    elapsedBusinessMinutes: number,
    targetBusinessMinutes: number,
    holdReason?: string | null
  ): { slaStatus: SLAStatus; pausesSLA: boolean } {
    // Hold reasons that pause SLA
    const slaPausingReasons = ['WAITING_MATERIAL', 'WAITING_CUSTOMER', 'WAITING_APPROVAL'];
    const pausesSLA = holdReason ? slaPausingReasons.includes(holdReason) : false;

    if (elapsedBusinessMinutes > targetBusinessMinutes) {
      return { slaStatus: 'BREACHED', pausesSLA };
    }

    if (elapsedBusinessMinutes >= targetBusinessMinutes * 0.8) {
      return { slaStatus: 'AT_RISK', pausesSLA };
    }

    return { slaStatus: 'ON_TRACK', pausesSLA };
  }

  /**
   * Emits Business Event to Outbox (Atomic DB Contract - Section 22 & 23)
   */
  static emitBusinessEvent(
    eventType: string,
    businessId: string,
    branchId: string,
    actorId: string,
    aggregateType: 'service_order' | 'job' | 'delivery',
    aggregateId: string,
    correlationId: string,
    causationId: string,
    payload: Record<string, any>
  ): BusinessEventContract {
    const event: BusinessEventContract = {
      event_id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event_type: eventType,
      event_version: 1,
      occurred_at: new Date().toISOString(),
      business_id: businessId,
      branch_id: branchId,
      actor_id: actorId,
      aggregate_type: aggregateType,
      aggregate_id: aggregateId,
      correlation_id: correlationId,
      causation_id: causationId,
      payload: AuditLogger.sanitizePayload(payload)
    };

    this.outboxEvents.push(event);
    return event;
  }

  /**
   * Command Idempotency Guard (Section 27)
   */
  static executeCommandIdempotent(
    businessId: string,
    commandId: string,
    commandName: string,
    executionFn: () => any
  ): { isDuplicate: boolean; result: any } {
    const cacheKey = `${businessId}_${commandId}`;
    if (this.idempotencyCache.has(cacheKey)) {
      return {
        isDuplicate: true,
        result: { status: 'CACHED_IDEMPOTENT_SUCCESS', message: 'Command already executed.' }
      };
    }

    const result = executionFn();
    this.idempotencyCache.add(cacheKey);

    return {
      isDuplicate: false,
      result
    };
  }

  /**
   * Retrieves pending outbox events
   */
  static getOutboxEvents(): BusinessEventContract[] {
    return this.outboxEvents;
  }
}
