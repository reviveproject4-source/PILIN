import assert from 'assert';
import { BusinessProfileService } from '../domains/business/businessProfileService';

console.log('============================================================');
console.log('STARTING BUSINESS PROFILE & RECEIPT CONFIG VERIFICATION');
console.log('============================================================');

// 1. Initial State Fetch
const tenantId = 'tenant-test-001';
const initial = BusinessProfileService.getProfile(tenantId);
assert(initial.business_name, 'TEST 1: Initial business name is present');
console.log('[PASS] TEST 1: Initial business profile fallback loaded correctly');

// 2. Update Profile & Save
const updatedData = {
  business_name: 'LAUNDRY & CLEANING SUPREME',
  business_address: 'Jl. Boulevard Raya No. 88, Kelapa Gading',
  business_phone: '081987654321',
  logo_url: 'https://example.com/logo-supreme.png',
  terms_and_conditions: '1. Pengambilan barang wajib membawa nota fisik.\n2. Komplain maksimal 24 jam setelah pengambilan.',
};

const saved = BusinessProfileService.updateProfile(tenantId, updatedData);
assert.strictEqual(saved.business_name, 'LAUNDRY & CLEANING SUPREME');
assert.strictEqual(saved.business_address, 'Jl. Boulevard Raya No. 88, Kelapa Gading');
assert.strictEqual(saved.business_phone, '081987654321');
assert.strictEqual(saved.logo_url, 'https://example.com/logo-supreme.png');
assert.strictEqual(saved.terms_and_conditions, updatedData.terms_and_conditions);
console.log('[PASS] TEST 2: Update business profile succeeded');

// 3. Re-fetch Profile (Persistence verification)
const refetched = BusinessProfileService.getProfile(tenantId);
assert.strictEqual(refetched.business_name, 'LAUNDRY & CLEANING SUPREME');
assert.strictEqual(refetched.business_address, 'Jl. Boulevard Raya No. 88, Kelapa Gading');
assert.strictEqual(refetched.terms_and_conditions, updatedData.terms_and_conditions);
console.log('[PASS] TEST 3: Re-fetched profile matches saved configuration (Persistence Verified)');

console.log('============================================================');
console.log('BUSINESS PROFILE VERIFICATION COMPLETE: ALL PASSED');
console.log('============================================================');
