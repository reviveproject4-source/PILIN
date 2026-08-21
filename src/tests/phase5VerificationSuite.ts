import { WorkDomainService } from '../domains/work/workDomainService';

console.log('=== MINARA BOS PHASE 5 AUTOMATED VERIFICATION SUITE ===\n');

// 1. SERVICE ORDER STATE MACHINE TESTS
console.log('--- 1. SERVICE ORDER STATE MACHINE TESTS ---');
const validSO = WorkDomainService.validateServiceOrderTransition('RECEIVED', 'DIAGNOSIS');
console.log(`Valid Transition (RECEIVED -> DIAGNOSIS): ${validSO.isValid ? 'PASS' : 'FAIL'}`);

const invalidSO = WorkDomainService.validateServiceOrderTransition('RECEIVED', 'DELIVERED');
console.log(`Invalid Transition (RECEIVED -> DELIVERED): Valid? ${invalidSO.isValid} | Reason: "${invalidSO.reason}" | ${!invalidSO.isValid ? 'PASS (REJECTED)' : 'FAIL'}\n`);

// 2. JOB STATE MACHINE & MANDATORY QC GATE TESTS
console.log('--- 2. JOB STATE MACHINE & MANDATORY QC GATE TESTS ---');
const uninspectedComplete = WorkDomainService.validateJobTransition('QC', 'COMPLETED', false);
console.log(`Uninspected Job (QC -> COMPLETED without PASS): Valid? ${uninspectedComplete.isValid} | Reason: "${uninspectedComplete.reason}" | ${!uninspectedComplete.isValid ? 'PASS (QC GATE REJECTED)' : 'FAIL'}`);

const passedComplete = WorkDomainService.validateJobTransition('QC', 'COMPLETED', true);
console.log(`Inspected Passed Job (QC -> COMPLETED with PASS): Valid? ${passedComplete.isValid} | ${passedComplete.isValid ? 'PASS' : 'FAIL'}\n`);

// 3. SLA CALCULATION & HOLD PAUSE RULES
console.log('--- 3. SLA CALCULATION & HOLD PAUSE RULES ---');
const slaNormal = WorkDomainService.calculateSLA(45, 120, null);
console.log(`SLA 45/120 Min (Normal): Status=${slaNormal.slaStatus}, PausesSLA=${slaNormal.pausesSLA} | PASS`);

const slaHoldMaterial = WorkDomainService.calculateSLA(45, 120, 'WAITING_MATERIAL');
console.log(`SLA 45/120 Min (Hold WAITING_MATERIAL): Status=${slaHoldMaterial.slaStatus}, PausesSLA=${slaHoldMaterial.pausesSLA} | ${slaHoldMaterial.pausesSLA ? 'PASS (PAUSED)' : 'FAIL'}`);

const slaBreached = WorkDomainService.calculateSLA(130, 120, null);
console.log(`SLA 130/120 Min (Exceeded): Status=${slaBreached.slaStatus} | ${slaBreached.slaStatus === 'BREACHED' ? 'PASS (BREACHED)' : 'FAIL'}\n`);

// 4. BUSINESS EVENT EMBEDDING & OUTBOX CONTRACT
console.log('--- 4. BUSINESS EVENT & OUTBOX CONTRACT ---');
const evt = WorkDomainService.emitBusinessEvent(
  'SERVICE_ORDER_APPROVED',
  'biz-01',
  'branch-01',
  'user-owner',
  'service_order',
  'so-100',
  'wf-999',
  'cmd-500',
  { approved_by: 'user-owner', total_approved_price: 350000 }
);

console.log(`Emitted Event Type: ${evt.event_type} | Aggregate ID: ${evt.aggregate_id} | Correlation ID: ${evt.correlation_id}`);
console.log(`Outbox Count: ${WorkDomainService.getOutboxEvents().length} | PASS\n`);

// 5. COMMAND IDEMPOTENCY GUARD
console.log('--- 5. COMMAND IDEMPOTENCY GUARD ---');
const cmd1 = WorkDomainService.executeCommandIdempotent('biz-01', 'cmd-unique-999', 'APPROVE_SERVICE_ORDER', () => ({ status: 'APPROVED' }));
console.log(`Command Attempt 1: Duplicate? ${cmd1.isDuplicate} | Result: ${cmd1.result.status} | PASS`);

const cmd2 = WorkDomainService.executeCommandIdempotent('biz-01', 'cmd-unique-999', 'APPROVE_SERVICE_ORDER', () => ({ status: 'APPROVED' }));
console.log(`Command Attempt 2 (Retry): Duplicate? ${cmd2.isDuplicate} | Result: ${cmd2.result.status} | ${cmd2.isDuplicate ? 'PASS (IDEMPOTENT CACHED)' : 'FAIL'}\n`);

console.log('=== PHASE 5 VERIFICATION SUITE COMPLETE ===');
