/**
 * MINARA BOS — OUTBOX PROCESSOR
 * 
 * Manages outbox event polling/scanning, worker concurrency claims, dispatching,
 * retry loops, dead-lettering, and event replay.
 */

import { OutboxEventRecord, ConsumerResult } from './eventTypes';
import { EventDispatcher } from './eventDispatcher';

export class OutboxProcessor {
  private static outboxStore: OutboxEventRecord[] = [];

  static clearStore() {
    this.outboxStore = [];
    EventDispatcher.clearStore();
  }

  static addOutboxEvent(event: OutboxEventRecord) {
    this.outboxStore.push(event);
  }

  static getOutboxEvents(): OutboxEventRecord[] {
    return [...this.outboxStore];
  }

  /**
   * Processes all pending and retry outbox events cleanly
   */
  static async processOutbox(options?: { workerId?: string }): Promise<{
    processedEvents: number;
    results: ConsumerResult[];
  }> {
    const workerId = options?.workerId || 'worker-01';
    const allResults: ConsumerResult[] = [];

    for (const event of this.outboxStore) {
      const dispatchResults = await EventDispatcher.dispatch(event, { workerId });
      allResults.push(...dispatchResults);
    }

    return {
      processedEvents: this.outboxStore.length,
      results: allResults,
    };
  }

  /**
   * Replays a specific event by ID
   */
  static async replayEvent(eventId: string, options?: { workerId?: string }): Promise<ConsumerResult[]> {
    const event = this.outboxStore.find((e) => e.event_id === eventId);
    if (!event) {
      throw new Error(`EVENT_NOT_FOUND: Outbox event '${eventId}' does not exist.`);
    }
    return EventDispatcher.dispatch(event, { workerId: options?.workerId || 'worker-replay' });
  }

  /**
   * Replays all failed / dead-letter events
   */
  static async replayFailedEvents(options?: { workerId?: string }): Promise<ConsumerResult[]> {
    const records = EventDispatcher.getAllProcessingRecords().filter(
      (r) => r.status === 'FAILED' || r.status === 'DEAD_LETTER' || r.status === 'RETRY'
    );
    const results: ConsumerResult[] = [];

    for (const rec of records) {
      const event = this.outboxStore.find((e) => e.event_id === rec.event_id);
      if (event) {
        // Reset status for replay
        rec.status = 'PENDING';
        rec.attempt_count = 0;
        const res = await EventDispatcher.dispatch(event, { workerId: options?.workerId || 'worker-replay-failed' });
        results.push(...res);
      }
    }

    return results;
  }
}
