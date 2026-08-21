/**
 * MINARA BOS — EVENT DISPATCHER
 * 
 * Routes outbox events to registered consumers while enforcing idempotency,
 * payload safety, correlation/causation preservation, retry limits, and dead-letter handling.
 */

import { OutboxEventRecord, EventProcessingRecord, ConsumerResult, ProcessingStatus } from './eventTypes';
import { EventRegistry } from './eventRegistry';

export class EventDispatcher {
  private static processingStore = new Map<string, EventProcessingRecord>();
  public static readonly MAX_RETRIES = 3;

  static clearStore() {
    this.processingStore.clear();
  }

  static getProcessingRecord(eventId: string, consumerName: string): EventProcessingRecord | undefined {
    return this.processingStore.get(`${eventId}:${consumerName}`);
  }

  static getAllProcessingRecords(): EventProcessingRecord[] {
    return Array.from(this.processingStore.values());
  }

  /**
   * Dispatches an outbox event to all registered consumers safely
   */
  static async dispatch(event: OutboxEventRecord, options?: { workerId?: string }): Promise<ConsumerResult[]> {
    const workerId = options?.workerId || 'worker-default';

    // 1. Payload Safety Validation
    const validation = this.validateEventPayload(event);
    if (!validation.isValid) {
      const failedRecord = this.recordProcessingFailure(
        event,
        'GlobalPayloadValidator',
        validation.errorCode || 'INVALID_EVENT_PAYLOAD',
        validation.reason || 'Payload validation failed',
        true // Permanent failure
      );
      return [
        {
          success: false,
          consumer_name: 'GlobalPayloadValidator',
          consumerName: 'GlobalPayloadValidator',
          status: failedRecord.status,
          error: validation.reason,
          is_permanent_failure: true,
        },
      ];
    }

    // 2. Resolve Registered Consumers
    const consumers = EventRegistry.getConsumers(event.event_type);
    if (consumers.length === 0) {
      return [
        {
          success: true,
          consumer_name: 'None',
          consumerName: 'None',
          status: 'UNHANDLED_EVENT',
        },
      ];
    }

    const results: ConsumerResult[] = [];

    for (const consumer of consumers) {
      const processingKey = `${event.event_id}:${consumer.consumerName}`;
      let record = this.processingStore.get(processingKey);

      // 3. Check Processing Idempotency
      if (record && record.status === 'SUCCEEDED') {
        results.push({
          success: true,
          consumer_name: consumer.consumerName,
          consumerName: consumer.consumerName,
          status: 'IDEMPOTENT_SUCCESS',
        });
        continue;
      }

      // 4. Atomic Worker Claim Check
      if (record && record.status === 'PROCESSING' && record.claimed_by_worker_id !== workerId) {
        // Event currently being processed by another worker
        results.push({
          success: false,
          consumer_name: consumer.consumerName,
          consumerName: consumer.consumerName,
          status: 'PROCESSING',
          error: `CLAIMED_BY_ANOTHER_WORKER: Event ${event.event_id} claimed by ${record.claimed_by_worker_id}`,
        });
        continue;
      }

      // Initialize or claim record
      const attemptCount = (record ? record.attempt_count : 0) + 1;
      record = {
        id: `proc-${event.event_id}-${consumer.consumerName}`,
        event_id: event.event_id,
        consumer_name: consumer.consumerName,
        business_id: event.business_id,
        branch_id: event.branch_id,
        status: 'PROCESSING',
        attempt_count: attemptCount,
        max_retries: this.MAX_RETRIES,
        claimed_by_worker_id: workerId,
        claimed_at: new Date().toISOString(),
        created_at: record ? record.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.processingStore.set(processingKey, record);

      try {
        // 5. Execute Consumer
        const consumerResult = await consumer.handle(event);

        record.status = 'SUCCEEDED';
        record.processed_at = new Date().toISOString();
        record.claimed_by_worker_id = undefined;
        record.updated_at = new Date().toISOString();
        this.processingStore.set(processingKey, record);

        results.push({
          ...consumerResult,
          consumer_name: consumer.consumerName,
          consumerName: consumer.consumerName,
          status: 'SUCCEEDED',
        });
      } catch (err: any) {
        const isPermanent = err.isPermanent || attemptCount >= this.MAX_RETRIES;
        const finalStatus: ProcessingStatus = isPermanent ? (attemptCount >= this.MAX_RETRIES ? 'DEAD_LETTER' : 'FAILED') : 'RETRY';

        record.status = finalStatus;
        record.last_error = err.message || 'Consumer execution failed';
        record.claimed_by_worker_id = undefined;
        record.updated_at = new Date().toISOString();
        this.processingStore.set(processingKey, record);

        results.push({
          success: false,
          consumer_name: consumer.consumerName,
          consumerName: consumer.consumerName,
          status: finalStatus,
          error: record.last_error,
          is_permanent_failure: isPermanent,
        });
      }
    }

    return results;
  }

  /**
   * Validates event payload safety
   */
  private static validateEventPayload(event: OutboxEventRecord): { isValid: boolean; errorCode?: string; reason?: string } {
    if (!event.business_id || event.business_id.trim() === '') {
      return { isValid: false, errorCode: 'INVALID_TENANT_CONTEXT', reason: 'INVALID_TENANT_CONTEXT: business_id is missing or invalid.' };
    }
    if (!event.aggregate_id || event.aggregate_id.trim() === '') {
      return { isValid: false, errorCode: 'INVALID_AGGREGATE_CONTEXT', reason: 'INVALID_AGGREGATE_CONTEXT: aggregate_id is missing or invalid.' };
    }
    if (event.event_version !== 1) {
      return { isValid: false, errorCode: 'INVALID_EVENT_VERSION', reason: `INVALID_EVENT_VERSION: Event version ${event.event_version} is unsupported (Expected 1).` };
    }
    return { isValid: true };
  }

  private static recordProcessingFailure(
    event: OutboxEventRecord,
    consumerName: string,
    errorCode: string,
    reason: string,
    isPermanent: boolean
  ): EventProcessingRecord {
    const processingKey = `${event.event_id}:${consumerName}`;
    const record: EventProcessingRecord = {
      id: `proc-${event.event_id}-${consumerName}`,
      event_id: event.event_id,
      consumer_name: consumerName,
      business_id: event.business_id || 'UNKNOWN',
      branch_id: event.branch_id,
      status: isPermanent ? 'FAILED' : 'RETRY',
      attempt_count: 1,
      max_retries: this.MAX_RETRIES,
      last_error: `${errorCode}: ${reason}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.processingStore.set(processingKey, record);
    return record;
  }
}
