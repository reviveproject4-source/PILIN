import { WorkQueueService } from '../domains/work/workQueueService';
import { WorkDomainService } from '../domains/work/workDomainService';

export function runPhase8WorkSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 WORK OPERATIONS & SLA SPECIFIC SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --- TEST 1: Retrieve Work Orders (Schema 00009 Contract) ---
  const initialOrders = WorkQueueService.getOrders();
  assert(initialOrders.length >= 3, 'Initial work order queue contains at least 3 seed records (Schema 00009)');
  assert(initialOrders[0].order_number === 'SO-2026-001' && initialOrders[0].status === 'IN_PROGRESS', 'Order 1 SO-2026-001 has status IN_PROGRESS');

  // --- TEST 2: Valid State Machine Transitions (WorkDomainService) ---
  const validTransition = WorkDomainService.validateServiceOrderTransition('RECEIVED', 'DIAGNOSIS');
  assert(validTransition.isValid === true, 'Transition RECEIVED -> DIAGNOSIS is VALID');

  const invalidTransition = WorkDomainService.validateServiceOrderTransition('RECEIVED', 'DELIVERED');
  assert(invalidTransition.isValid === false, 'Transition RECEIVED -> DELIVERED is INVALID and blocked');

  // --- TEST 3: State Machine Execution via WorkQueueService ---
  const updateRes1 = WorkQueueService.updateOrderStatus(initialOrders[2].id, 'DIAGNOSIS');
  assert(updateRes1.success === true, 'Order 3 status transition from RECEIVED to DIAGNOSIS succeeded');

  const updateResInvalid = WorkQueueService.updateOrderStatus(initialOrders[2].id, 'DELIVERED');
  assert(updateResInvalid.success === false, 'Invalid order status transition blocked by server-side validation');

  // --- TEST 4: SLA Status Calculation ---
  const slaOnTrack = WorkDomainService.calculateSLA(45, 120);
  assert(slaOnTrack.slaStatus === 'ON_TRACK', '45/120 min elapsed evaluated as ON_TRACK');

  const slaAtRisk = WorkDomainService.calculateSLA(100, 120);
  assert(slaAtRisk.slaStatus === 'AT_RISK', '100/120 min elapsed (83%) evaluated as AT_RISK');

  const slaBreached = WorkDomainService.calculateSLA(130, 120);
  assert(slaBreached.slaStatus === 'BREACHED', '130/120 min elapsed evaluated as BREACHED');

  // --- TEST 5: Create SPK / Service Order ---
  const newSpk = WorkQueueService.createWorkOrder({
    customer_name: 'Dewi Lestari',
    service_name: 'Standard Service 04',
    worker_name: 'Teknisi Charlie',
  });

  assert(newSpk.customer_name === 'Dewi Lestari', 'Newly created SPK customer name assigned cleanly');
  assert(newSpk.status === 'RECEIVED', 'Newly created SPK initial status set to RECEIVED');
  assert(newSpk.worker_name === 'Teknisi Charlie', 'Newly created SPK worker assigned cleanly');

  // --- TEST 6: QC Inspector Gate ---
  const qcRes = WorkQueueService.updateOrderQC(newSpk.id, 'PASSED');
  assert(qcRes.success === true, 'QC inspection status updated to PASSED');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8WorkSuite();
}
