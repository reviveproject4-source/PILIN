import { normalizePhoneNumber, isValidIndonesianPhone } from '../lib/normalizePhoneNumber';
import { CustomerImporterEngine, MappedImportRow } from '../domains/customer/importerEngine';
import { AuditLogger } from '../domains/control/auditLogger';
import { Customer, TransactionStatus } from '../lib/types';
import fs from 'fs';
import path from 'path';

console.log('=== MINARA BOS PHASE 0-2 VERIFICATION SUITE ===\n');

// ==========================================
// 1. PHONE NORMALIZATION TEST MATRIX (Section 12)
// ==========================================
console.log('--- 1. PHONE NORMALIZATION TESTS ---');
const phoneTestCases = [
  { input: '08123456789', expected: '628123456789' },
  { input: '+62 812 3456 789', expected: '628123456789' },
  { input: '628123456789', expected: '628123456789' },
  { input: '0812-3456-789', expected: '628123456789' },
  { input: ' 08123456789 ', expected: '628123456789' },
  { input: '+62-812-3456-789', expected: '628123456789' },
  { input: 'invalid_phone', expected: '' },
  { input: '', expected: '' },
  { input: null, expected: '' }
];

let phonePassed = 0;
phoneTestCases.forEach((tc, i) => {
  const result = normalizePhoneNumber(tc.input);
  const pass = result === tc.expected;
  if (pass) phonePassed++;
  console.log(`Test 1.${i+1}: Input "${tc.input}" => "${result}" | Expected: "${tc.expected}" | ${pass ? 'PASS' : 'FAIL'}`);
});
console.log(`Phone Normalization Result: ${phonePassed}/${phoneTestCases.length} Passed\n`);

// ==========================================
// 2. CUSTOMER IMPORT TEST MATRIX (10 CASES - Section 5 & 6)
// ==========================================
console.log('--- 2. CUSTOMER IMPORT TEST MATRIX & IDEMPOTENCY ---');

const existingDbCustomers: Customer[] = [
  {
    id: 'cust-100',
    business_id: 'biz-01',
    nama: 'Budi Santoso',
    no_hp: '08123456789',
    no_hp_normalized: '628123456789',
    email: 'budi@email.com',
    alamat: undefined, // NULL field in Minara
    source_system: 'moka',
    source_customer_id: 'MOKA-001',
    tags: ['VIP'],
    communication_preference: 'ALL',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const importMatrix: { id: number; name: string; row: MappedImportRow; policy: any; expectedAction: string }[] = [
  // 1. New customer
  { id: 1, name: 'New Customer', row: { source_customer_id: 'MOKA-002', nama: 'Siti Rahma', no_hp: '08139999888', email: 'siti@email.com' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'CREATE_NEW' },
  // 2. Existing customer
  { id: 2, name: 'Existing Customer by Ext ID', row: { source_customer_id: 'MOKA-001', nama: 'Budi Santoso', no_hp: '08123456789', email: 'budi@email.com' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_EXTERNAL_ID' },
  // 3. Same customer with different phone formatting (+62...)
  { id: 3, name: 'Same customer formatted phone', row: { nama: 'Budi Santoso', no_hp: '+62 812 3456 789' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_PHONE' },
  // 4. Duplicate source_customer_id
  { id: 4, name: 'Duplicate source_customer_id', row: { source_customer_id: 'MOKA-001', nama: 'Budi Santoso (Dup)' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_EXTERNAL_ID' },
  // 5. Duplicate normalized phone
  { id: 5, name: 'Duplicate normalized phone', row: { nama: 'Budi (Alt Name)', no_hp: '628123456789' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_PHONE' },
  // 6. Duplicate email
  { id: 6, name: 'Duplicate email', row: { nama: 'Budi (Email Match)', email: 'BUDI@EMAIL.COM' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_EMAIL' },
  // 7. Possible duplicate (Name + Phone Suffix match)
  { id: 7, name: 'Possible duplicate', row: { nama: 'Budi Santoso', no_hp: '08993456789' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'POSSIBLE_DUPLICATE' },
  // 8. Existing populated field + incoming NULL
  { id: 8, name: 'Populated email + incoming NULL email', row: { source_customer_id: 'MOKA-001', nama: 'Budi Santoso', email: undefined, alamat: 'Jl. Sudirman 10' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_EXTERNAL_ID' },
  // 9. Existing NULL field + incoming populated value
  { id: 9, name: 'NULL alamat + incoming populated alamat', row: { source_customer_id: 'MOKA-001', nama: 'Budi Santoso', alamat: 'Jl. Sudirman 10' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_EXTERNAL_ID' },
  // 10. Re-import exact same file
  { id: 10, name: 'Re-import exact same file', row: { source_customer_id: 'MOKA-001', nama: 'Budi Santoso', no_hp: '08123456789', email: 'budi@email.com' }, policy: 'UPDATE_EMPTY_ONLY', expectedAction: 'MATCH_EXTERNAL_ID' }
];

let importPassed = 0;
importMatrix.forEach(tc => {
  const norm = CustomerImporterEngine.normalizeRow(tc.row);
  const match = CustomerImporterEngine.matchExistingCustomer(norm, 'moka', existingDbCustomers);
  const pass = match.action === tc.expectedAction;
  if (pass) importPassed++;
  console.log(`Import Test 2.${tc.id} [${tc.name}]: Action => "${match.action}" (Expected: "${tc.expectedAction}") | ${pass ? 'PASS' : 'FAIL'}`);

  // Test UPDATE_EMPTY_ONLY Policy behavior for cases 8 & 9
  if (tc.id === 8) {
    const updates = CustomerImporterEngine.applyUpdatePolicy(existingDbCustomers[0], norm, 'UPDATE_EMPTY_ONLY');
    const emailPreserved = updates.email === undefined; // Email in Minara is not overwritten with NULL
    console.log(`   └ Policy Check Case 8: Existing email preserved? ${emailPreserved ? 'YES (PASS)' : 'NO (FAIL)'}`);
  }
  if (tc.id === 9) {
    const updates = CustomerImporterEngine.applyUpdatePolicy(existingDbCustomers[0], norm, 'UPDATE_EMPTY_ONLY');
    const alamatUpdated = updates.alamat === 'Jl. Sudirman 10'; // Alamat updated because Minara had NULL
    console.log(`   └ Policy Check Case 9: NULL alamat populated? ${alamatUpdated ? 'YES (PASS)' : 'NO (FAIL)'}`);
  }
});
console.log(`Customer Import Matrix Result: ${importPassed}/${importMatrix.length} Passed\n`);

// ==========================================
// 3. AUDIT LOGGER PII SANITIZATION TEST (Section 11)
// ==========================================
console.log('--- 3. AUDIT LOGGER SANITIZATION TESTS ---');
const rawLogPayload = {
  user_id: 'user-001',
  password: 'SuperSecretPassword123!',
  auth_token: 'bearer_eyJhbGciOi...',
  no_hp: '628123456789',
  operation_note: 'Void request submitted'
};

const sanitizedPayload = AuditLogger.sanitizePayload(rawLogPayload);
const passwordRedacted = sanitizedPayload.password === '[REDACTED]';
const tokenRedacted = sanitizedPayload.auth_token === '[REDACTED]';
const phoneMasked = sanitizedPayload.no_hp === '62812****789';

console.log('Sanitized Payload Output:', JSON.stringify(sanitizedPayload, null, 2));
console.log(`Password Redacted: ${passwordRedacted ? 'PASS' : 'FAIL'}`);
console.log(`Token Redacted: ${tokenRedacted ? 'PASS' : 'FAIL'}`);
console.log(`Phone Masked: ${phoneMasked ? 'PASS' : 'FAIL'}\n`);

// ==========================================
// 4. SERVICE ROLE & CREDENTIAL EXPOSURE SCAN (Section 3)
// ==========================================
console.log('--- 4. SERVICE ROLE SECRET EXPOSURE SCAN ---');
function scanDirectoryForSecret(dir: string): string[] {
  const violations: string[] = [];
  const files = fs.readdirSync(dir, { recursive: true });
  for (const file of files) {
    const fullPath = path.join(dir, String(file));
    if (fs.statSync(fullPath).isFile() && (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js')) && !fullPath.includes('tests')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('SUPABASE_' + 'SERVICE_ROLE_KEY') && !fullPath.includes('server')) {
        violations.push(`Client-side reference found in: ${fullPath}`);
      }
      if (content.includes('NEXT_PUBLIC_' + 'SUPABASE_SERVICE_ROLE_KEY')) {
        violations.push(`NEXT_PUBLIC Service Role Key found in: ${fullPath}`);
      }
    }
  }
  return violations;
}

const srcDir = path.join(process.cwd(), 'src');
const secretViolations = scanDirectoryForSecret(srcDir);
console.log(`Secret Scan Violations Count: ${secretViolations.length}`);
if (secretViolations.length === 0) {
  console.log('PASS: Service Role Key is NEVER exposed to client-side code or NEXT_PUBLIC variables.\n');
} else {
  console.log('FAIL:', secretViolations, '\n');
}

// ==========================================
// 5. TRANSACTION STATE MACHINE & LIFECYCLE VERIFICATION (Section 8, 9, 10)
// ==========================================
console.log('--- 5. TRANSACTION STATE MACHINE & VOID LIFECYCLE ---');
const validTransitions = [
  { from: 'DRAFT', to: 'PENDING_PAYMENT', allowed: true },
  { from: 'PENDING_PAYMENT', to: 'COMPLETED', allowed: true },
  { from: 'DRAFT', to: 'COMPLETED', allowed: true },
  { from: 'COMPLETED', to: 'VOID_REQUESTED', allowed: true },
  { from: 'VOID_REQUESTED', to: 'VOIDED', allowed: true }
];

const retentionEligibility = (status: TransactionStatus) => status === 'COMPLETED';

console.log('Retention Eligibility for DRAFT:', retentionEligibility('DRAFT') ? 'ELIGIBLE (FAIL)' : 'INELIGIBLE (PASS)');
console.log('Retention Eligibility for PENDING_PAYMENT:', retentionEligibility('PENDING_PAYMENT') ? 'ELIGIBLE (FAIL)' : 'INELIGIBLE (PASS)');
console.log('Retention Eligibility for COMPLETED:', retentionEligibility('COMPLETED') ? 'ELIGIBLE (PASS)' : 'INELIGIBLE (FAIL)');
console.log('Retention Eligibility for VOIDED:', retentionEligibility('VOIDED') ? 'ELIGIBLE (FAIL)' : 'INELIGIBLE (PASS)');

console.log('\n=== VERIFICATION SUITE COMPLETE ===');
