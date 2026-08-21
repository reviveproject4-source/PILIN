/**
 * MINARA BOS — EVENT CONSUMER REGISTRY
 * 
 * Defines explicit consumer ownership for Phase 6 Management Control events.
 * Enforces notification, intelligence, and corrective action boundaries.
 */

import { Phase6EventType, EventConsumer, OutboxEventRecord, ConsumerResult } from './eventTypes';

// 1. Notification Consumers
export class ManagementNotificationConsumer implements EventConsumer {
  consumerName = 'ManagementNotificationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    // Communication Boundary: Queues notification intent without direct WhatsApp integration
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `NOTIFICATION_INTENT:${event.event_type}:${event.aggregate_id}`,
    };
  }
}

export class AssignmentNotificationConsumer implements EventConsumer {
  consumerName = 'AssignmentNotificationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `ASSIGNMENT_NOTIFICATION_INTENT:${event.aggregate_id}`,
    };
  }
}

export class CorrectiveActionNotificationConsumer implements EventConsumer {
  consumerName = 'CorrectiveActionNotificationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `CORRECTIVE_ACTION_NOTIFICATION_INTENT:${event.aggregate_id}`,
    };
  }
}

// 2. Approval & Execution Consumers
export class ManagementApprovalConsumer implements EventConsumer {
  consumerName = 'ManagementApprovalConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `APPROVAL_DISPATCH_INTENT:${event.aggregate_id}`,
    };
  }
}

export class ManagementExecutionConsumer implements EventConsumer {
  consumerName = 'ManagementExecutionConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `EXECUTION_TRACKING_INTENT:${event.aggregate_id}`,
    };
  }
}

// 3. Verification & Revision Consumers
export class ResultVerificationConsumer implements EventConsumer {
  consumerName = 'ResultVerificationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `RESULT_VERIFICATION_INTENT:${event.aggregate_id}`,
    };
  }
}

export class ManagementVerificationConsumer implements EventConsumer {
  consumerName = 'ManagementVerificationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `VERIFICATION_DISPATCH_INTENT:${event.aggregate_id}`,
    };
  }
}

export class EvidenceVerificationConsumer implements EventConsumer {
  consumerName = 'EvidenceVerificationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `EVIDENCE_VERIFICATION_INTENT:${event.aggregate_id}`,
    };
  }
}

export class EvidenceRevisionConsumer implements EventConsumer {
  consumerName = 'EvidenceRevisionConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `EVIDENCE_REVISION_INTENT:${event.aggregate_id}`,
    };
  }
}

export class ManagementEvaluationConsumer implements EventConsumer {
  consumerName = 'ManagementEvaluationConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      intent_created: `EVALUATION_DISPATCH_INTENT:${event.aggregate_id}`,
    };
  }
}

// 4. Intelligence Consumer (Analytical projections & Corrective Action Boundary)
export class ManagementIntelligenceConsumer implements EventConsumer {
  consumerName = 'ManagementIntelligenceConsumer';

  async handle(event: OutboxEventRecord): Promise<ConsumerResult> {
    // Corrective Action Boundary: If NOT_ACHIEVED, emit recommendation signal without auto-creating Action Plan
    let signal = `INTELLIGENCE_PROJECTION:${event.event_type}:${event.aggregate_id}`;
    if (event.event_type === 'ACTION_RESULT_EVALUATED' && event.payload?.outcome === 'NOT_ACHIEVED') {
      signal = 'CORRECTIVE_ACTION_RECOMMENDED';
    }

    return {
      success: true,
      consumer_name: this.consumerName,
      status: 'SUCCEEDED',
      signal_emitted: signal,
    };
  }
}

export class EventRegistry {
  private static registry = new Map<Phase6EventType, EventConsumer[]>();

  static initialize() {
    const notificationConsumer = new ManagementNotificationConsumer();
    const assignmentNotificationConsumer = new AssignmentNotificationConsumer();
    const correctiveActionNotificationConsumer = new CorrectiveActionNotificationConsumer();
    const approvalConsumer = new ManagementApprovalConsumer();
    const executionConsumer = new ManagementExecutionConsumer();
    const resultVerificationConsumer = new ResultVerificationConsumer();
    const managementVerificationConsumer = new ManagementVerificationConsumer();
    const evidenceVerificationConsumer = new EvidenceVerificationConsumer();
    const evidenceRevisionConsumer = new EvidenceRevisionConsumer();
    const evaluationConsumer = new ManagementEvaluationConsumer();
    const intelligenceConsumer = new ManagementIntelligenceConsumer();

    this.registry.clear();

    this.register('ACTION_PLAN_CREATED', [notificationConsumer]);
    this.register('ACTION_PLAN_SUBMITTED', [approvalConsumer]);
    this.register('ACTION_PLAN_APPROVED', [executionConsumer]);
    this.register('ACTION_PLAN_REJECTED', [notificationConsumer]);
    this.register('ACTION_PLAN_REVISION_REQUESTED', [notificationConsumer]);
    this.register('ACTION_PLAN_ACTIVATED', [executionConsumer]);
    this.register('ACTION_PLAN_STARTED', [executionConsumer]);
    this.register('ACTION_PLAN_SUBMITTED_FOR_RESULT', [resultVerificationConsumer]);
    this.register('ACTION_PLAN_VERIFIED', [managementVerificationConsumer]);
    this.register('ACTION_PLAN_COMPLETED', [intelligenceConsumer]);
    this.register('ACTION_ASSIGNED', [assignmentNotificationConsumer]);
    this.register('ACTION_REASSIGNED', [assignmentNotificationConsumer]);
    this.register('ACTION_RELEASED', [assignmentNotificationConsumer]);
    this.register('EVIDENCE_SUBMITTED', [evidenceVerificationConsumer]);
    this.register('EVIDENCE_VERIFIED', [resultVerificationConsumer]);
    this.register('EVIDENCE_REJECTED', [evidenceRevisionConsumer]);
    this.register('ACTION_RESULT_SUBMITTED', [resultVerificationConsumer]);
    this.register('ACTION_RESULT_VERIFIED', [evaluationConsumer]);
    this.register('ACTION_RESULT_EVALUATED', [intelligenceConsumer]);
    this.register('CORRECTIVE_ACTION_CREATED', [correctiveActionNotificationConsumer]);
  }

  static register(eventType: Phase6EventType, consumers: EventConsumer[]) {
    this.registry.set(eventType, consumers);
  }

  static getConsumers(eventType: string): EventConsumer[] {
    if (this.registry.size === 0) {
      this.initialize();
    }
    return this.registry.get(eventType as Phase6EventType) || [];
  }
}
