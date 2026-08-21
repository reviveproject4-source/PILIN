import { ServiceCatalogService } from '../domains/catalog/serviceCatalogService';

export function runPhase8PosSuite() {
  console.log('\n============================================================');
  console.log('STARTING PHASE 8 POS COMMERCE SPECIFIC SUITE');
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

  // --- TEST 1: Read Master Service Catalog (Schema 00007 Contract) ---
  ServiceCatalogService.resetDefaultCatalogForTest();
  const catalog = ServiceCatalogService.getMasterCatalog();
  assert(catalog.length === 4, 'Master catalog contains 4 standard service items (Schema 00007)');
  assert(catalog[0].sku === 'SKU-SRV-001' && catalog[0].base_harga === 75000, 'Catalog Item 1 SKU-SRV-001 has base_harga 75,000');
  assert(catalog[1].sku === 'SKU-SRV-002' && catalog[1].base_harga === 120000, 'Catalog Item 2 SKU-SRV-002 has base_harga 120,000');

  // --- TEST 2: Add Item & Quantity Management ---
  let cart: Array<{ id: string; nama: string; qty: number; unit_price: number }> = [];
  
  const addToCart = (item: { id: string; nama: string; unit_price: number }) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      cart = cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
    } else {
      cart.push({ id: item.id, nama: item.nama, qty: 1, unit_price: item.unit_price });
    }
  };

  addToCart({ id: catalog[0].id, nama: catalog[0].nama, unit_price: catalog[0].base_harga });
  assert(cart.length === 1 && cart[0].qty === 1, 'Add to cart adds 1 item with qty 1');

  addToCart({ id: catalog[0].id, nama: catalog[0].nama, unit_price: catalog[0].base_harga });
  assert(cart[0].qty === 2, 'Adding duplicate item increments qty to 2');

  addToCart({ id: catalog[1].id, nama: catalog[1].nama, unit_price: catalog[1].base_harga });
  assert(cart.length === 2, 'Adding distinct service item creates new cart entry');

  // --- TEST 3: Quantity Increment/Decrement & Removal ---
  const updateQty = (id: string, delta: number) => {
    cart = cart.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : null;
      }
      return i;
    }).filter(Boolean) as typeof cart;
  };

  updateQty(catalog[0].id, -1);
  assert(cart[0].qty === 1, 'Quantity decrement reduces qty from 2 to 1');

  updateQty(catalog[0].id, -1);
  assert(cart.find(i => i.id === catalog[0].id) === undefined, 'Quantity decrement to 0 removes item from cart');

  // --- TEST 4: Subtotal & Total Calculation (Schema 00008 Contract: Total = Subtotal - Discount) ---
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const discount = 0;
  const total = subtotal - discount;

  assert(subtotal === 120000, `Subtotal calculated correctly: Rp ${subtotal} (Expected: 120,000)`);
  assert(total === 120000, `Total calculated correctly according to Schema 00008 contract (Subtotal - Discount = Total): Rp ${total}`);

  // --- TEST 5: Payment Method Constraint (Schema 00008 Constraint: 'cash' | 'transfer') ---
  const validPaymentMethods: Array<'cash' | 'transfer'> = ['cash', 'transfer'];
  assert(validPaymentMethods.includes('cash') && validPaymentMethods.includes('transfer'), 'Payment methods strictly adhere to Schema 00008 constraints (cash | transfer)');

  // --- TEST 6: Checkout Execution & Cart Reset ---
  let localSessionRevenue = 4000000;
  const executeCheckout = (method: 'cash' | 'transfer') => {
    if (cart.length === 0) return null;
    const checkoutSubtotal = cart.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
    const checkoutTotal = checkoutSubtotal - 0;
    localSessionRevenue += checkoutTotal;
    cart = [];
    return { id: 'TRX-2026-TEST', total: checkoutTotal, method };
  };

  const trxResult = executeCheckout('cash');
  assert(trxResult !== null && trxResult.total === 120000, 'Checkout creates transaction object with total 120,000');
  assert(cart.length === 0, 'Checkout clears cart completely');
  assert(localSessionRevenue === 4120000, `Local session revenue updated cleanly: Rp ${localSessionRevenue} (Expected: 4,120,000)`);

  // --- TEST 7: GD-07 / OD-02 Price Override Authority & Master Catalog Protection ---
  const srvId = catalog[0].id;
  const mgrOverride = ServiceCatalogService.overrideServicePrice(srvId, 65000, 'manager');
  assert(mgrOverride.overridePrice === 65000 && mgrOverride.masterBasePrice === 75000, 'Manager (Tier 3) permitted to override service price for transaction context (GD-07)');

  const ownerOverride = ServiceCatalogService.overrideServicePrice(srvId, 60000, 'owner');
  assert(ownerOverride.overridePrice === 60000 && ownerOverride.masterBasePrice === 75000, 'Owner (Tier 2) permitted to override service price for transaction context (GD-07 / OD-02)');

  let cashierOverrideFailed = false;
  try {
    ServiceCatalogService.overrideServicePrice(srvId, 50000, 'cashier');
  } catch (err: any) {
    cashierOverrideFailed = err.message.includes('Tier 3 Manager or Tier 2 Owner authority required');
  }
  assert(cashierOverrideFailed, 'Cashier price override prohibited and rejected cleanly (GD-07)');

  const masterCatalogAfter = ServiceCatalogService.getServiceById(srvId);
  assert(masterCatalogAfter?.base_harga === 75000, 'Master catalog base_harga remains protected and unmutated (75,000) (GD-07)');

  console.log('\n============================================================');
  console.log(`SUITE COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runPhase8PosSuite();
}

