import { GamificationDomainService } from '../domains/intelligence/gamificationDomainService';

export function runPhase8GamificationSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 GAMIFICATION DATA INTEGRITY SUITE (GD-15)');
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

  // --- TEST 1: Retrieve Seed Gamification Records ---
  const records = GamificationDomainService.getRecords();
  assert(records.length >= 2, 'Initial gamification records present');
  assert(records[0].source_event_ids !== undefined && records[0].source_event_ids.length > 0, 'Gamification record contains traceable source_event_ids (GD-15 Traceability)');

  // --- TEST 2: Reject Direct Manual Operational Input Without Source Event IDs ---
  let manualInputFailed = false;
  try {
    GamificationDomainService.recordPerformance({
      staff_name: 'Staf Tanpa Event',
      completed_transactions_count: 5,
      revenue_amount: 1000000,
      new_customers_count: 2,
    });
  } catch (err: any) {
    manualInputFailed = err.message.includes('rejected without authoritative source_event_ids');
  }
  assert(manualInputFailed, 'Direct manual injection of operational numbers rejected without source_event_ids (GD-15 Manual Input Guard)');

  // --- TEST 3: Automated Ingestion of System Operational Events ---
  const mockTransactions = [
    { id: 'trx-101', total_amount: 250000 },
    { id: 'trx-102', total_amount: 350000 },
  ];
  const mockCustomers = [
    { id: 'cust-201' },
  ];

  const ingestedRecord = GamificationDomainService.aggregateSystemPerformance(
    { transactions: mockTransactions, newCustomers: mockCustomers },
    'Staf Event Otomatis'
  );

  assert(ingestedRecord.completed_transactions_count === 2, 'Automated ingestion calculates 2 completed transactions from system events');
  assert(ingestedRecord.revenue_amount === 600000, 'Automated ingestion sums Rp 600,000 revenue from system events');
  assert(ingestedRecord.new_customers_count === 1, 'Automated ingestion counts 1 new customer registration');
  assert(
    ingestedRecord.source_event_ids !== undefined &&
    ingestedRecord.source_event_ids.includes('trx-101') &&
    ingestedRecord.source_event_ids.includes('cust-201'),
    'Performance record stores traceable list of operational source event IDs'
  );

  // --- TEST 4: Record Performance With Valid Source Event IDs ---
  const validManual = GamificationDomainService.recordPerformance({
    staff_name: 'Staf Terverifikasi',
    completed_transactions_count: 3,
    revenue_amount: 900000,
    new_customers_count: 1,
    source_event_ids: ['trx-301', 'trx-302', 'trx-303'],
  });

  assert(validManual.source_event_ids?.length === 3, 'Record performance with valid source_event_ids succeeds');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8GamificationSuite();
}
