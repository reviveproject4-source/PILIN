/**
 * MINARA BOS — PHASE 6 EVENT CONSUMER & OUTBOX PROCESSING TYPES
 * 
 * Defines standard data contracts for outbox events, event processing records,
 * consumer results, and consumer registry.
 */

export type Phase6EventType =
  | 'DECISION_CREATED'
  | 'DECISION_APPROVED'
  | 'DECISION_REJECTED'
  | 'DECISION_ACTIVATED'
  | 'DECISION_SUPERSEDED'
  | 'ACTION_PLAN_CREATED'
  | 'ACTION_PLAN_SUBMITTED'
  | 'ACTION_PLAN_APPROVED'
  | 'ACTION_PLAN_REJECTED'
  | 'ACTION_PLAN_REVISION_REQUESTED'
  | 'ACTION_PLAN_ACTIVATED'
  | 'ACTION_PLAN_STARTED'
  | 'ACTION_PLAN_SUBMITTED_FOR_RESULT'
  | 'ACTION_PLAN_VERIFIED'
  | 'ACTION_PLAN_COMPLETED'
  | 'ACTION_ASSIGNED'
  | 'ACTION_REASSIGNED'
  | 'ACTION_RELEASED'
  | 'EVIDENCE_SUBMITTED'
  | 'EVIDENCE_VERIFIED'
  | 'EVIDENCE_REJECTED'
  | 'ACTION_RESULT_SUBMITTED'
  | 'ACTION_RESULT_VERIFIED'
  | 'ACTION_RESULT_EVALUATED'
  | 'CORRECTIVE_ACTION_CREATED';

export type ProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'RETRY'
  | 'FAILED'
  | 'DEAD_LETTER'
  | 'IDEMPOTENT_SUCCESS'
  | 'UNHANDLED_EVENT';

export interface OutboxEventRecord {
  event_id: string;
  event_type: string;
  event_version: number;
  occurred_at: string;
  business_id: string;
  branch_id?: string;
  actor_id: string;
  aggregate_type: string;
  aggregate_id: string;
  correlation_id: string;
  causation_id: string;
  payload: Record<string, any>;
}

export interface EventProcessingRecord {
  id: string;
  event_id: string;
  consumer_name: string;
  business_id: string;
  branch_id?: string;
  status: ProcessingStatus;
  attempt_count: number;
  max_retries: number;
  last_error?: string;
  claimed_by_worker_id?: string;
  claimed_at?: string;
  processed_at?: string;
  next_retry_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConsumerResult {
  success: boolean;
  consumer_name: string;
  consumerName?: string;
  status: ProcessingStatus;
  intent_created?: string;
  signal_emitted?: string;
  error?: string;
  is_permanent_failure?: boolean;
}

export interface EventConsumer {
  consumerName: string;
  handle(event: OutboxEventRecord): Promise<ConsumerResult>;
}
