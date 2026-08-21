import { RetentionDomainService } from '../domains/retention/retentionDomainService';
import { HypnosellingEngine } from '../domains/retention/hypnosellingEngine';

export function runPhase8RetentionSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 CUSTOMER RETENTION & HYPNOSELLING SUITE');
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

  // --- TEST 1: Retrieve Sapaan Logs (Schema 00016 Contract) ---
  const initialLogs = RetentionDomainService.getSapaanLogs();
  assert(initialLogs.length >= 2, 'Initial sapaan log list contains at least 2 seed records (Schema 00016)');
  assert(initialLogs[0].customer_name === 'Budi Santoso' && initialLogs[0].category === 'SAPAAN', 'Log 1 Budi Santoso category SAPAAN in ACTIVE status');

  // --- TEST 2: Generate Live Message Preview via HypnosellingEngine ---
  const preview = RetentionDomainService.generatePreview('Siti Rahma', 'HYPPOSELLING');
  assert(preview.customerName === 'Siti Rahma', 'Message preview customerName set cleanly');
  assert(preview.category === 'HYPPOSELLING', 'Message preview category set to HYPPOSELLING');
  assert(preview.fullMessageBody.includes('Siti Rahma'), 'Message body personalized with customer name');
  assert(preview.eligibility.isEligible === true, 'Customer passes eligibility check');

  // --- TEST 3: Schedule New Sapaan Log ---
  const scheduled = RetentionDomainService.scheduleSapaan({
    customer_name: 'Ahmad Yani',
    customer_phone: '628112233445',
    category: 'QUOTE',
    message_text: preview.fullMessageBody,
  });

  assert(scheduled.customer_name === 'Ahmad Yani', 'Newly scheduled sapaan customer name assigned cleanly');
  assert(scheduled.status === 'ACTIVE', 'Newly scheduled sapaan initial status set to ACTIVE');

  const updatedLogs = RetentionDomainService.getSapaanLogs();
  assert(updatedLogs.length === initialLogs.length + 1, 'Updated sapaan log queue includes newly scheduled item');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8RetentionSuite();
}
