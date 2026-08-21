import { CustomerDomainService } from '../domains/customer/customerService';

export function runPhase8CustomerSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 CUSTOMER DOMAIN SPECIFIC SUITE');
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

  // --- TEST 1: Retrieve Customers (Schema 00006 Contract) ---
  const initialList = CustomerDomainService.getCustomers();
  assert(initialList.length >= 3, 'Initial customer list contains at least 3 seed records (Schema 00006)');
  assert(initialList[0].nama === 'Budi Santoso' && initialList[0].no_hp_normalized === '628123456789', 'Customer 1 Budi Santoso has canonical normalized phone 628123456789');

  // --- TEST 2: Search Customer Matrix ---
  const searchByName = CustomerDomainService.searchCustomers('siti');
  assert(searchByName.length === 1 && searchByName[0].nama === 'Siti Rahma', 'Search by name "siti" finds Siti Rahma');

  const searchByEmail = CustomerDomainService.searchCustomers('outlook.com');
  assert(searchByEmail.length === 1 && searchByEmail[0].nama === 'Ahmad Yani', 'Search by email domain "outlook.com" finds Ahmad Yani');

  const searchByPhone = CustomerDomainService.searchCustomers('08123456789');
  assert(searchByPhone.length === 1 && searchByPhone[0].nama === 'Budi Santoso', 'Search by phone number "08123456789" matches normalized customer record');

  // --- TEST 3: Register Customer with Automatic Normalization ---
  const newCust = CustomerDomainService.registerCustomer({
    nama: 'Dewi Lestari',
    no_hp: '+62 815 7777 999',
    email: 'dewi@gmail.com',
    alamat: 'Jl. Malioboro No. 5, Yogyakarta',
  });

  assert(newCust.nama === 'Dewi Lestari', 'Newly registered customer name saved cleanly');
  assert(newCust.no_hp_normalized === '628157777999', 'Customer phone automatically normalized to 628157777999');
  assert(newCust.source_system === 'POS_MANUAL', 'Customer source system marked as POS_MANUAL according to schema 00006');

  const updatedList = CustomerDomainService.getCustomers();
  assert(updatedList.length === initialList.length + 1, 'Updated customer list includes newly registered customer');

  // --- TEST 4: Customer Duplicate Merge Authority (GD-10) ---
  const custA = initialList[0].id;
  const custB = initialList[1].id;

  let unauthorizedMergeFailed = false;
  try {
    CustomerDomainService.mergeCustomer(custA, custB, 'pegawai');
  } catch (err: any) {
    unauthorizedMergeFailed = err.message.includes('Unauthorized customer merge');
  }
  assert(unauthorizedMergeFailed, 'Merge by unauthorized role "pegawai" correctly rejected (GD-10)');

  let sameIdMergeFailed = false;
  try {
    CustomerDomainService.mergeCustomer(custA, custA, 'manager');
  } catch (err: any) {
    sameIdMergeFailed = err.message.includes('canonicalId and duplicateId must be different');
  }
  assert(sameIdMergeFailed, 'Merge with identical canonicalId and duplicateId correctly rejected');

  const mergeResult = CustomerDomainService.mergeCustomer(custA, custB, 'manager');
  assert(mergeResult.duplicate.status === 'MERGED', 'Duplicate customer status updated to MERGED non-destructively');
  assert(mergeResult.duplicate.merged_into_id === custA, 'Duplicate customer merged_into_id points to canonical customer ID');

  const activeAfterMerge = CustomerDomainService.getCustomers();
  assert(!activeAfterMerge.some(c => c.id === custB), 'Merged customer excluded from active customer list');

  // --- TEST 5: Customer Archiving & 5-Year Retention Gate (GD-11 / OD-04) ---
  const custC = initialList[2].id;

  const archivedCust = CustomerDomainService.archiveCustomer(custC, 'manager');
  assert(archivedCust.status === 'ARCHIVED' && !!archivedCust.archived_at, 'Customer status changed to ARCHIVED with timestamp');

  let unauthorizedDeleteFailed = false;
  try {
    CustomerDomainService.permanentDeleteCustomer(custC, 'manager');
  } catch (err: any) {
    unauthorizedDeleteFailed = err.message.includes('Owner authority required');
  }
  assert(unauthorizedDeleteFailed, 'Permanent delete by Manager rejected (Owner authority required)');

  let prematureDeleteFailed = false;
  try {
    CustomerDomainService.permanentDeleteCustomer(custC, 'owner');
  } catch (err: any) {
    prematureDeleteFailed = err.message.includes('Retention period (5 years) has not elapsed');
  }
  assert(prematureDeleteFailed, 'Permanent delete before 5-year retention period rejected (OD-04)');

  // Simulate 5-year old archived timestamp for testing owner delete gate
  const oldArchivedDate = new Date(Date.now() - (5 * 365 + 1) * 24 * 60 * 60 * 1000).toISOString();
  archivedCust.archived_at = oldArchivedDate;

  const deletedCust = CustomerDomainService.permanentDeleteCustomer(custC, 'owner');
  assert(deletedCust.status === 'PERMANENT_DELETED' && !!deletedCust.deleted_at, 'Permanent delete by Owner after 5 years retention succeeds');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8CustomerSuite();
}

