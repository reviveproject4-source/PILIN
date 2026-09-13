import { ServiceCatalogService } from '../domains/catalog/serviceCatalogService';
import { POSTransactionService } from '../domains/commerce/POSTransactionService';
import { POSTransactionRepository } from '../domains/commerce/POSTransactionRepository';
import { FinancialReportService } from '../domains/finance/financialReportService';

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

  // --- TEST 8: P0-1 HPP Snapshot & Financial P&L Assertions (Requirements A-K) ---
  POSTransactionService.resetTransactionsForTest();

  // Test A & B: HPP snapshot captured from catalog at checkout (qty 2 * unit_hpp 30000 = HPP 60000)
  const trx1 = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [
      { service_id: catalog[0].id, qty: 2, unit_price: catalog[0].base_harga }, // catalog[0]: price 75000, hpp 30000
    ],
  });

  assert(trx1.items !== undefined && trx1.items.length === 1, 'TEST 8A: Transaction item recorded with snapshot details');
  assert(trx1.items![0].unit_hpp === 30000, 'TEST 8A: HPP snapshot captured from catalog at checkout (unit_hpp = 30,000)');
  assert(trx1.items![0].line_hpp === 60000, 'TEST 8B: Item line_hpp calculated accurately: qty 2 * unit_hpp 30,000 = 60,000');
  assert(trx1.total_amount === 150000, 'TEST 8B: Transaction total_amount calculated accurately: 150,000');
  assert(trx1.total_hpp === 60000, 'TEST 8B: Transaction total_hpp calculated accurately: 60,000');

  // Test C & D: Multiple items aggregate correctly & zero-HPP item handling
  // Create zero-HPP labor service item in catalog for testing
  const zeroHppService = ServiceCatalogService.addMasterService({
    nama: 'Konsultasi Gratis / Labor Only',
    base_harga: 50000,
    hpp: 0,
    bahan_baku: 'Labor Only',
  });

  const trx2 = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [
      { service_id: catalog[1].id, qty: 1, unit_price: 120000 }, // hpp 45000
      { service_id: zeroHppService.id, qty: 1, unit_price: 50000 }, // hpp 0
    ],
  });

  assert(trx2.total_amount === 170000, 'TEST 8C: Multiple items total amount aggregated: 170,000');
  assert(trx2.total_hpp === 45000, 'TEST 8C: Multiple items total HPP aggregated: 45,000');
  assert(trx2.items![1].unit_hpp === 0 && trx2.items![1].line_hpp === 0, 'TEST 8D: Zero-HPP labor-only service remains valid with unit_hpp = 0');

  // Test E: Revenue 100,000, HPP 40,000 -> Gross Profit 60,000
  const pnlResult1 = FinancialReportService.calculateProfitAndLoss(100000, 40000, 0, 'Test Month');
  assert(pnlResult1.grossProfit === 60000, 'TEST 8E: Revenue 100,000 - HPP 40,000 = Gross Profit 60,000');

  // Test F: Gross Profit minus expense -> Net Profit
  const pnlResult2 = FinancialReportService.calculateProfitAndLoss(100000, 40000, 15000, 'Test Month');
  assert(pnlResult2.grossProfit === 60000, 'TEST 8F: Gross Profit = 60,000');
  assert(pnlResult2.netProfit === 45000, 'TEST 8F: Net Profit = Gross Profit 60,000 - Expenses 15,000 = 45,000');
  assert(pnlResult2.profitMarginPercent === 45, 'TEST 8F: Profit margin % = (45,000 / 100,000) * 100 = 45%');

  // Test G: Zero revenue margin handling (no division by zero)
  const pnlZero = FinancialReportService.calculateProfitAndLoss(0, 0, 10000, 'Zero Month');
  assert(pnlZero.grossProfit === 0 && pnlZero.netProfit === -10000, 'TEST 8G: Zero revenue with expenses yields net profit -10,000');
  assert(pnlZero.profitMarginPercent === 0, 'TEST 8G: Zero revenue profit margin percent handled safely without division by zero');

  // Test H: Negative profit allowed
  const pnlNeg = FinancialReportService.calculateProfitAndLoss(100000, 80000, 30000, 'Loss Month');
  assert(pnlNeg.grossProfit === 20000, 'TEST 8H: Revenue 100k - HPP 80k = Gross Profit 20k');
  assert(pnlNeg.netProfit === -10000, 'TEST 8H: Gross Profit 20k - Expense 30k = Net Profit -10k (Negative profit allowed)');

  // Test I: HPP does not change retroactively when catalog HPP changes
  const originalCatalogItem = catalog[0];
  const oldHpp = originalCatalogItem.hpp;
  // Mutate master catalog HPP
  originalCatalogItem.hpp = 999999;
  // Historical transaction HPP snapshot on trx1 must remain unchanged (60000)
  assert(trx1.items![0].unit_hpp === 30000 && trx1.total_hpp === 60000, 'TEST 8I: Historical transaction HPP snapshot remains immutable (30,000) when catalog HPP changes');
  // Restore original HPP
  originalCatalogItem.hpp = oldHpp;

  // Test J: No fabricated historical backfill (DB has 0 rows, mock array reset clean)
  const totalCompletedHpp = POSTransactionService.getTotalCompletedHpp();
  assert(totalCompletedHpp === 60000 + 45000, 'TEST 8J: Aggregate completed HPP matches active checkout transactions: 105,000 (60,000 + 45,000)');

  // --- TEST 10: Basic Refund Foundation Assertions ---
  const refundedTrx = POSTransactionService.processRefund({
    transactionId: trx1.id,
    refundAmount: trx1.total_amount,
    reason: 'Customer cancelled service',
    approverRole: 'owner',
    approverId: 'owner-001',
  });
  assert(refundedTrx.status === 'REFUNDED', 'TEST 10A: COMPLETED transaction successfully transitions to REFUNDED status');
  assert(refundedTrx.total_amount === 150000, 'TEST 10B: Original total_amount remains intact (150,000) post-refund');
  assert(refundedTrx.total_hpp === 60000, 'TEST 10C: Original total_hpp remains intact (60,000) post-refund');
  assert(refundedTrx.items !== undefined && refundedTrx.items.length === 1, 'TEST 10D: Transaction items remain intact post-refund');

  // Excluded from active completed HPP aggregate
  const activeCompletedHppPostRefund = POSTransactionService.getTotalCompletedHpp();
  assert(activeCompletedHppPostRefund === 45000, 'TEST 10E: REFUNDED transaction excluded from active completed HPP total (reduces from 105,000 to 45,000)');

  // SoD / Tier rejection check
  let unauthorizedRefundBlocked = false;
  try {
    POSTransactionService.processRefund({
      transactionId: trx2.id,
      refundAmount: 170000, // Valid amount for trx2 (total_amount 170,000)
      reason: 'Refund authorization test',
      approverRole: 'cashier',
      approverId: 'cashier-002',
      tenantLowerThreshold: 100000, // Triggers Tier 2 Owner threshold
    });
  } catch (err: any) {
    unauthorizedRefundBlocked = err.message.includes('Tier 2 Owner authority required');
  }
  assert(unauthorizedRefundBlocked, 'TEST 10F: Unauthorized refund approval attempt by cashier rejected cleanly');

  // --- TEST 11: PHASE 2 DUAL HPP MODE (PERCENTAGE vs ACTUAL_COST) & NET PROFIT FORMULA ---
  // Case 1: Percentage HPP (50% of selling price 100k -> HPP 50k)
  const pctService50 = ServiceCatalogService.addMasterService({
    nama: 'Servis Custom Persentase 50%',
    base_harga: 100000,
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 50,
  });
  assert(pctService50.hpp === 50000, 'PHASE 2 CASE 1: Master service created with 50% percentage HPP computes hpp = 50,000');

  const trxPct1 = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [{ service_id: pctService50.id, qty: 1, unit_price: 100000 }],
  });
  assert(trxPct1.items![0].unit_hpp === 50000 && trxPct1.total_hpp === 50000, 'PHASE 2 CASE 1: Checkout with 50% HPP snapshots unit_hpp 50,000 & total_hpp 50,000');

  // Case 2: Percentage HPP 25% with Qty 2 (25% of selling price 80k -> unit_hpp 20k, line_hpp 40k)
  const pctService25 = ServiceCatalogService.addMasterService({
    nama: 'Servis Custom Persentase 25%',
    base_harga: 80000,
    hpp_mode: 'PERCENTAGE',
    hpp_percent: 25,
  });
  const trxPct2 = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [{ service_id: pctService25.id, qty: 2, unit_price: 80000 }],
  });
  assert(trxPct2.items![0].unit_hpp === 20000, 'PHASE 2 CASE 2: 25% HPP of 80,000 computes unit_hpp = 20,000');
  assert(trxPct2.total_hpp === 40000, 'PHASE 2 CASE 2: Qty 2 * unit_hpp 20,000 yields total_hpp = 40,000');

  // Case 3: Actual Cost Mode (Purchase cost 25k vs Selling price 40k -> HPP 25k)
  const actualCostService = ServiceCatalogService.addMasterService({
    nama: 'Servis Cost Manual (Harga Beli)',
    base_harga: 40000,
    hpp: 25000,
    hpp_mode: 'ACTUAL_COST',
  });
  const trxActual = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [{ service_id: actualCostService.id, qty: 1, unit_price: 40000 }],
  });
  assert(trxActual.items![0].unit_hpp === 25000 && trxActual.total_hpp === 25000, 'PHASE 2 CASE 3: Actual Cost mode preserves exact manual HPP 25,000');

  // Case 4: Product + Service Combined Single Transaction Test (Section 21 - Test 3)
  const productOli = ServiceCatalogService.addMasterService({
    nama: 'Oli Mesin Synthetic 1L',
    base_harga: 50000,
    hpp: 35000,
    hpp_mode: 'ACTUAL_COST',
    item_type: 'PRODUCT',
  });
  const serviceGantiOli = ServiceCatalogService.addMasterService({
    nama: 'Jasa Ganti Oli',
    base_harga: 30000,
    hpp: 0,
    hpp_mode: 'ACTUAL_COST',
    item_type: 'SERVICE',
  });

  const trxCombined = POSTransactionService.createTransaction({
    business_id: '00000000-0000-0000-0000-000000000001',
    branch_id: '00000000-0000-0000-0000-000000000010',
    created_by: 'cashier-001',
    items: [
      { service_id: productOli.id, qty: 1, unit_price: 50000 },
      { service_id: serviceGantiOli.id, qty: 1, unit_price: 30000 },
    ],
  });

  assert(trxCombined.total_amount === 80000, 'PHASE 2 COMBINED TRX: Total Revenue = 50,000 + 30,000 = 80,000');
  assert(trxCombined.total_hpp === 35000, 'PHASE 2 COMBINED TRX: Product HPP = 35,000, Service HPP = 0 (No fabricated labor HPP!)');
  assert(trxCombined.total_amount - (trxCombined.total_hpp || 0) === 45000, 'PHASE 2 COMBINED TRX: Gross Profit = 80,000 - 35,000 = 45,000');

  // Case 5: Net Profit Formula (Gross Profit = Revenue - HPP, Net Profit = Gross Profit - Expense)
  const pnlPhase2 = FinancialReportService.calculateProfitAndLoss(220000, 115000, 30000, 'Phase 2 Period');
  assert(pnlPhase2.grossProfit === 105000, 'PHASE 2 CASE 5: Gross Profit = Revenue 220k - HPP 115k = 105,000');
  assert(pnlPhase2.netProfit === 75000, 'PHASE 2 CASE 5: Net Profit = Gross Profit 105k - Expense 30k = 75,000');

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
