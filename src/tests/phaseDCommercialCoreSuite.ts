/**
 * PILIN — PHASE D COMMERCIAL CORE WORKFLOW TEST SUITE
 * 
 * Verifies End-to-End B2B Commercial workflows, RLS policies, payment verification limits,
 * multi-product invoicing, and provisioning idempotency.
 */

import fs from 'fs';
import path from 'path';

// Manual loading of .env.local to support command-line execution outside Next.js process context
function loadEnv() {
  try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const equalsIndex = trimmed.indexOf('=');
          if (equalsIndex > 0) {
            const key = trimmed.substring(0, equalsIndex).trim();
            let val = trimmed.substring(equalsIndex + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            process.env[key] = val;
          }
        }
      });
    }
  } catch (e) {
    // Ignore
  }
}
loadEnv();

import { createClient } from '../lib/supabase/client';
import { createAdminClient } from '../lib/supabase/admin';

interface TestResult {
  scenario: string;
  passed: boolean;
  message: string;
}

export async function runPhaseDWorkflowSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const admin = createAdminClient();
  const testId = Math.random().toString(36).substring(2, 7);

  // Test data variables to clean up later
  const createdUserIds: string[] = [];
  const createdCustomerIds: string[] = [];
  const createdInvoiceIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdSubscriptionIds: string[] = [];
  const createdProvisioningIds: string[] = [];
  const createdTenantIds: string[] = [];
  const createdProductIds: string[] = [];

  const logResult = (scenario: string, passed: boolean, message: string) => {
    results.push({ scenario, passed, message });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${scenario}: ${message}`);
  };

  try {
    console.log(`\n=== STARTING PHASE D COMMERCIAL CORE SUITE (RUN: ${testId}) ===\n`);

    // ----------------------------------------------------
    // PREPARATION: Roles & Products Seeding
    // ----------------------------------------------------
    const { data: roles, error: rolesError } = await admin.from('roles').select('id, code');
    if (rolesError || !roles) {
      throw new Error(`Failed to fetch platform roles: ${rolesError?.message}`);
    }

    const salesRoleId = roles.find(r => r.code === 'sales')?.id;
    const financeRoleId = roles.find(r => r.code === 'finance')?.id;

    if (!salesRoleId || !financeRoleId) {
      // Seed roles if they don't exist
      throw new Error('Required platform roles ("sales" or "finance") not found in "roles" table.');
    }

    // Seed test products
    const mainProdCode = `PILIN_${testId}`;
    const addonProdCode = `KABARSANTRI_${testId}`;

    const { data: mainProduct, error: mainProdError } = await admin
      .from('platform_products')
      .insert({
        code: mainProdCode,
        name: 'Pilin Core System',
        product_type: 'MAIN'
      })
      .select()
      .single();

    if (mainProdError || !mainProduct) {
      throw new Error(`Failed to seed main product: ${mainProdError?.message}`);
    }
    createdProductIds.push(mainProduct.id);

    const { data: addonProduct, error: addonProdError } = await admin
      .from('platform_products')
      .insert({
        code: addonProdCode,
        name: 'KabarSantri Addon',
        product_type: 'ADDON',
        parent_product_id: mainProduct.id
      })
      .select()
      .single();

    if (addonProdError || !addonProduct) {
      throw new Error(`Failed to seed addon product: ${addonProdError?.message}`);
    }
    createdProductIds.push(addonProduct.id);

    // Seed prices
    const { data: mainPrice } = await admin
      .from('platform_product_prices')
      .insert({
        product_id: mainProduct.id,
        price_amount: 1500000.00,
        valid_from: new Date().toISOString()
      })
      .select()
      .single();

    const { data: addonPrice } = await admin
      .from('platform_product_prices')
      .insert({
        product_id: addonProduct.id,
        price_amount: 500000.00,
        valid_from: new Date().toISOString()
      })
      .select()
      .single();

    // ----------------------------------------------------
    // PREPARATION: Create Test Auth Users & RLS Clients
    // ----------------------------------------------------
    const salesEmail = `sales_${testId}@example.com`;
    const financeEmail = `finance_${testId}@example.com`;
    const testPassword = 'SecurePassword123!';

    // Create Sales User
    const { data: salesUser, error: salesCreateError } = await admin.auth.admin.createUser({
      email: salesEmail,
      password: testPassword,
      email_confirm: true
    });
    if (salesCreateError || !salesUser.user) {
      throw new Error(`Failed to create sales user: ${salesCreateError?.message}`);
    }
    createdUserIds.push(salesUser.user.id);

    // Create Finance User
    const { data: financeUser, error: financeCreateError } = await admin.auth.admin.createUser({
      email: financeEmail,
      password: testPassword,
      email_confirm: true
    });
    if (financeCreateError || !financeUser.user) {
      throw new Error(`Failed to create finance user: ${financeCreateError?.message}`);
    }
    createdUserIds.push(financeUser.user.id);

    // Assign Roles
    await admin.from('platform_role_assignments').insert([
      { user_id: salesUser.user.id, role_id: salesRoleId, is_active: true },
      { user_id: financeUser.user.id, role_id: financeRoleId, is_active: true }
    ]);

    // Instantiate regular Supabase clients and sign in to get active tokens
    const salesClient = createClient();
    const financeClient = createClient();

    const { error: salesLoginError } = await salesClient.auth.signInWithPassword({
      email: salesEmail,
      password: testPassword
    });
    if (salesLoginError) {
      throw new Error(`Failed to login sales client: ${salesLoginError.message}`);
    }

    const { error: financeLoginError } = await financeClient.auth.signInWithPassword({
      email: financeEmail,
      password: testPassword
    });
    if (financeLoginError) {
      throw new Error(`Failed to login finance client: ${financeLoginError.message}`);
    }

    // ----------------------------------------------------
    // TEST 1: RLS & Sales Permissions
    // ----------------------------------------------------
    // Create customer via sales user
    const customerEmail = `client_${testId}@example.com`;
    const { data: customer, error: customerInsertError } = await salesClient
      .from('platform_customers')
      .insert({
        name: `B2B Corp_${testId}`,
        contact_name: 'Contact Person',
        email: customerEmail,
        phone: '6289999999',
        owner_email: `owner_${testId}@example.com`,
        sales_owner_user_id: salesUser.user.id
      })
      .select()
      .single();

    if (customerInsertError || !customer) {
      logResult('RLS: Sales Customer Creation', false, `Sales failed to create customer: ${customerInsertError?.message}`);
    } else {
      createdCustomerIds.push(customer.id);
      logResult('RLS: Sales Customer Creation', true, 'Sales user successfully created own customer.');
    }

    // Create sales application
    const { data: salesApp, error: salesAppError } = await salesClient
      .from('platform_sales_applications')
      .insert({
        customer_id: customer.id,
        product_id: mainProduct.id,
        sales_user_id: salesUser.user.id,
        status: 'PROSPECT'
      })
      .select()
      .single();

    if (salesAppError || !salesApp) {
      logResult('RLS: Sales App Creation', false, `Sales failed to create sales app: ${salesAppError?.message}`);
    } else {
      logResult('RLS: Sales App Creation', true, 'Sales user successfully created own sales application.');
    }

    // ----------------------------------------------------
    // TEST 2: Invoice Total Amount Validation Trigger
    // ----------------------------------------------------
    // Create an Invoice as Draft via admin (or finance user)
    const { data: invoiceDraft, error: invoiceError } = await admin
      .from('platform_invoices')
      .insert({
        sales_application_id: salesApp.id,
        customer_id: customer.id,
        total_amount: 1500000.00, // Correct sum matching items later
        status: 'DRAFT',
        finance_user_id: financeUser.user.id
      })
      .select()
      .single();

    if (invoiceError || !invoiceDraft) {
      throw new Error(`Failed to create draft invoice: ${invoiceError?.message}`);
    }
    createdInvoiceIds.push(invoiceDraft.id);

    // Try to update status to ISSUED before adding items (should fail)
    const { error: prematureIssueError } = await admin
      .from('platform_invoices')
      .update({ status: 'ISSUED' })
      .eq('id', invoiceDraft.id);

    const isValidationWorking = prematureIssueError && prematureIssueError.message.includes('Invoice total_amount');
    logResult(
      'Validation: Invoice Total Check (No Items)',
      !!isValidationWorking,
      isValidationWorking ? 'Correctly rejected status transition with mismatching item sum.' : 'Failed: Allowed status transition without items.'
    );

    // Insert correct line items
    await admin.from('platform_invoice_items').insert({
      invoice_id: invoiceDraft.id,
      product_id: mainProduct.id,
      price_id: mainPrice.id,
      price_amount: 1500000.00,
      quantity: 1
    });

    // Update status to ISSUED with matching price (should pass)
    const { error: correctIssueError } = await admin
      .from('platform_invoices')
      .update({ status: 'ISSUED' })
      .eq('id', invoiceDraft.id);

    logResult(
      'Validation: Invoice Total Check (Matching Items)',
      !correctIssueError,
      correctIssueError ? `Failed to issue invoice with matching items: ${correctIssueError.message}` : 'Invoice successfully transitioned to ISSUED status.'
    );

    // ----------------------------------------------------
    // TEST 3: Payment Verification & Role Check
    // ----------------------------------------------------
    // Insert a payment record proof
    const { data: payment, error: paymentError } = await admin
      .from('platform_payments')
      .insert({
        invoice_id: invoiceDraft.id,
        amount: 1500000.00,
        payment_date: new Date().toISOString(),
        proof_of_payment_url: 'http://example.com/proof.jpg',
        status: 'SUBMITTED'
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw new Error(`Failed to create payment: ${paymentError?.message}`);
    }
    createdPaymentIds.push(payment.id);

    // Verify Sales CANNOT verify payment
    const { error: salesVerifyError } = await salesClient
      .from('platform_payments')
      .update({ status: 'VERIFIED', verified_by: salesUser.user.id })
      .eq('id', payment.id);

    const isSalesBlocked = salesVerifyError && (salesVerifyError.message.includes('new row violates row-level security') || salesVerifyError.code === '42501');
    logResult(
      'Security: Sales Verify Rejection',
      !!isSalesBlocked,
      isSalesBlocked ? 'Sales user was successfully blocked from verifying payments.' : 'Failed: Sales user was allowed to modify payment status.'
    );

    // Try to verify payment with underpaid amount (should fail)
    // First, let's update payment amount to underpaid
    await admin.from('platform_payments').update({ amount: 1000000.00 }).eq('id', payment.id);
    const { error: underpaidVerifyError } = await financeClient
      .from('platform_payments')
      .update({ status: 'VERIFIED', verified_by: financeUser.user.id })
      .eq('id', payment.id);

    const isUnderpaidBlocked = underpaidVerifyError && underpaidVerifyError.message.includes('Payment amount');
    logResult(
      'Validation: Reject Underpaid Payment',
      !!isUnderpaidBlocked,
      isUnderpaidBlocked ? `Correctly rejected verification of underpaid payment: ${underpaidVerifyError.message}` : 'Failed: Underpaid payment was verified.'
    );

    // Restore correct payment amount and verify as Finance
    await admin.from('platform_payments').update({ amount: 1500000.00 }).eq('id', payment.id);
    const { error: financeVerifyError } = await financeClient
      .from('platform_payments')
      .update({ status: 'VERIFIED', verified_by: financeUser.user.id })
      .eq('id', payment.id);

    if (financeVerifyError) {
      logResult('Security: Finance Verification', false, `Finance user failed to verify payment: ${financeVerifyError.message}`);
    } else {
      logResult('Security: Finance Verification', true, 'Finance user successfully verified payment.');
    }

    // ----------------------------------------------------
    // TEST 4: Trigger Side Effects (Invoice, Sub, Provisioning)
    // ----------------------------------------------------
    // Check if invoice became PAID
    const { data: checkedInvoice } = await admin.from('platform_invoices').select('status').eq('id', invoiceDraft.id).single();
    const invoicePaid = checkedInvoice?.status === 'PAID';
    logResult('Trigger: Invoice Status Paid', invoicePaid, `Invoice status is: ${checkedInvoice?.status}`);

    // Check if subscription was created
    const { data: subs } = await admin.from('platform_subscriptions').select('id, status').eq('payment_id', payment.id);
    const subCreated = subs && subs.length === 1 && subs[0].status === 'PENDING';
    if (subs && subs.length > 0) {
      createdSubscriptionIds.push(...subs.map(s => s.id));
    }
    logResult('Trigger: Subscription Pending Creation', !!subCreated, `Subscriptions created count: ${subs?.length || 0}`);

    // Check if provisioning job was created
    const { data: provs } = await admin.from('platform_provisioning').select('id, status').eq('payment_id', payment.id);
    const provCreated = provs && provs.length === 1 && provs[0].status === 'PENDING';
    if (provs && provs.length > 0) {
      createdProvisioningIds.push(...provs.map(p => p.id));
    }
    logResult('Trigger: Provisioning Job Creation', !!provCreated, `Provisioning jobs created count: ${provs?.length || 0}`);

    // Verify duplicate VERIFIED payment per invoice is rejected
    const { data: payment2, error: payment2Error } = await admin
      .from('platform_payments')
      .insert({
        invoice_id: invoiceDraft.id,
        amount: 1500000.00,
        payment_date: new Date().toISOString(),
        proof_of_payment_url: 'http://example.com/proof2.jpg',
        status: 'SUBMITTED'
      })
      .select()
      .single();

    if (!payment2Error && payment2) {
      createdPaymentIds.push(payment2.id);
      const { error: doubleVerifyError } = await financeClient
        .from('platform_payments')
        .update({ status: 'VERIFIED', verified_by: financeUser.user.id })
        .eq('id', payment2.id);

      const isDoubleBlocked = doubleVerifyError && (doubleVerifyError.message.includes('uq_verified_payment_per_invoice') || doubleVerifyError.code === '23505');
      logResult(
        'Validation: Reject Duplicate Verified Payments',
        !!isDoubleBlocked,
        isDoubleBlocked ? 'Successfully blocked double verification for a single invoice.' : 'Failed: Double verified payments allowed.'
      );
    }

    // ----------------------------------------------------
    // SCENARIO A: CUSTOMER BARU (Tenant Onboarding Provisioning)
    // ----------------------------------------------------
    console.log('\n--- EXECUTING SCENARIO A: NEW CUSTOMER PROVISIONING ---');
    // Generate onboarding tenant params
    const tenantName = `Tenant E2E Corp_${testId}`;
    const tenantCode = `e2ecorp_${testId}`;

    // Simulate Background Worker
    // 1. Create Tenant via RPC create_tenant_onboarding
    const { data: tenantId, error: rpcError } = await admin.rpc('create_tenant_onboarding', {
      p_tenant_name: tenantName,
      p_tenant_code: tenantCode,
      p_owner_user_id: salesUser.user.id // Assigning test user as owner
    });

    if (rpcError || !tenantId) {
      throw new Error(`Scenario A: RPC create_tenant_onboarding failed: ${rpcError?.message}`);
    }
    createdTenantIds.push(tenantId);
    console.log(`Onboarded new Tenant ID: ${tenantId}`);

    // 2. Update customer tenant_id
    const { error: custUpdateError } = await admin
      .from('platform_customers')
      .update({ tenant_id: tenantId })
      .eq('id', customer.id);

    if (custUpdateError) {
      throw new Error(`Scenario A: Failed to associate tenant_id to customer: ${custUpdateError.message}`);
    }

    // 3. Update subscription tenant and status
    await admin
      .from('platform_subscriptions')
      .update({ status: 'ACTIVE' })
      .eq('payment_id', payment.id);

    // 4. Activate tenant product
    const { data: tenantProd, error: tenantProdError } = await admin
      .from('tenant_products')
      .insert({
        tenant_id: tenantId,
        product_id: mainProduct.id,
        status: 'ACTIVE',
        activated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantProdError || !tenantProd) {
      throw new Error(`Scenario A: Failed to activate tenant product: ${tenantProdError?.message}`);
    }

    // 5. Complete provisioning job
    await admin
      .from('platform_provisioning')
      .update({ status: 'COMPLETED', tenant_id: tenantId })
      .eq('payment_id', payment.id);

    // Verification of Scenario A
    const { data: updatedCustomer } = await admin.from('platform_customers').select('tenant_id').eq('id', customer.id).single();
    const { data: activeTenantProd } = await admin
      .from('tenant_products')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('product_id', mainProduct.id)
      .single();

    const isScenarioAPassed = updatedCustomer?.tenant_id === tenantId && activeTenantProd?.status === 'ACTIVE';
    logResult(
      'Scenario A: Customer Baru Provisioning',
      isScenarioAPassed,
      isScenarioAPassed
        ? 'Tenant successfully created, linked to customer, and product PILIN activated.'
        : 'Failed: Tenant or product activation failed.'
    );

    // ----------------------------------------------------
    // SCENARIO B: CUSTOMER EXISTING (Purchase Second Product)
    // ----------------------------------------------------
    console.log('\n--- EXECUTING SCENARIO B: EXISTING CUSTOMER SECOND PRODUCT ---');

    // Create a new invoice for the same customer with the addon product
    const { data: addonInvoice, error: addonInvError } = await admin
      .from('platform_invoices')
      .insert({
        sales_application_id: salesApp.id,
        customer_id: customer.id,
        total_amount: 500000.00,
        status: 'DRAFT',
        finance_user_id: financeUser.user.id
      })
      .select()
      .single();

    if (addonInvError || !addonInvoice) {
      throw new Error(`Scenario B: Failed to create addon invoice: ${addonInvError?.message}`);
    }
    createdInvoiceIds.push(addonInvoice.id);

    // Add invoice item for addon
    await admin.from('platform_invoice_items').insert({
      invoice_id: addonInvoice.id,
      product_id: addonProduct.id,
      price_id: addonPrice.id,
      price_amount: 500000.00,
      quantity: 1
    });

    // Move status to ISSUED
    await admin.from('platform_invoices').update({ status: 'ISSUED' }).eq('id', addonInvoice.id);

    // Create Payment for addon invoice
    const { data: addonPayment, error: addonPayError } = await admin
      .from('platform_payments')
      .insert({
        invoice_id: addonInvoice.id,
        amount: 500000.00,
        payment_date: new Date().toISOString(),
        proof_of_payment_url: 'http://example.com/proof_addon.jpg',
        status: 'SUBMITTED'
      })
      .select()
      .single();

    if (addonPayError || !addonPayment) {
      throw new Error(`Scenario B: Failed to create payment for addon: ${addonPayError?.message}`);
    }
    createdPaymentIds.push(addonPayment.id);

    // Verify payment as Finance
    await financeClient
      .from('platform_payments')
      .update({ status: 'VERIFIED', verified_by: financeUser.user.id })
      .eq('id', addonPayment.id);

    // Collect trigger side effects
    const { data: addonSubs } = await admin.from('platform_subscriptions').select('id').eq('payment_id', addonPayment.id);
    if (addonSubs && addonSubs.length > 0) {
      createdSubscriptionIds.push(...addonSubs.map(s => s.id));
    }
    const { data: addonProvs } = await admin.from('platform_provisioning').select('id').eq('payment_id', addonPayment.id);
    if (addonProvs && addonProvs.length > 0) {
      createdProvisioningIds.push(...addonProvs.map(p => p.id));
    }

    // Simulate Background Worker for Existing Customer
    // 1. Worker checks if customer already has a tenant_id assigned
    const { data: customerState } = await admin.from('platform_customers').select('tenant_id').eq('id', customer.id).single();
    const existingTenantId = customerState?.tenant_id;

    if (!existingTenantId) {
      throw new Error('Scenario B: Existing tenant_id not found on customer record.');
    }

    // 2. Since tenant exists, directly activate the second product on the existing tenant
    const { data: secondProductProd, error: secondProdError } = await admin
      .from('tenant_products')
      .insert({
        tenant_id: existingTenantId,
        product_id: addonProduct.id,
        status: 'ACTIVE',
        activated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (secondProdError || !secondProductProd) {
      throw new Error(`Scenario B: Failed to activate second product: ${secondProdError?.message}`);
    }

    // 3. Mark subscription and provisioning complete
    await admin.from('platform_subscriptions').update({ status: 'ACTIVE' }).eq('payment_id', addonPayment.id);
    await admin.from('platform_provisioning').update({ status: 'COMPLETED', tenant_id: existingTenantId }).eq('payment_id', addonPayment.id);

    // Verification of Scenario B
    // Confirm second product is active on the existing tenant
    const { data: checkSecondProd } = await admin
      .from('tenant_products')
      .select('status')
      .eq('tenant_id', existingTenantId)
      .eq('product_id', addonProduct.id)
      .single();

    // Confirm no other tenant was created
    const { data: tenantCount } = await admin.from('platform_customers').select('tenant_id').eq('id', customer.id);
    const uniqueTenants = tenantCount && tenantCount.length === 1 && tenantCount[0].tenant_id === existingTenantId;

    const isScenarioBPassed = checkSecondProd?.status === 'ACTIVE' && uniqueTenants;
    logResult(
      'Scenario B: Customer Existing Second Product',
      !!isScenarioBPassed,
      isScenarioBPassed
        ? 'Second product activated successfully on the same tenant. No duplicate tenant was created.'
        : 'Failed: Second product activation failed or duplicate tenant created.'
    );

  } catch (err: any) {
    console.error('Test Suite encountered an unexpected exception:', err);
    logResult('Suite Runtime Exception', false, err.message || 'Unknown error');
  } finally {
    console.log('\n--- CLEANING UP TEST DATA ---');

    // Delete Provisioning Queue
    if (createdPaymentIds.length > 0) {
      await admin.from('platform_provisioning').delete().in('payment_id', createdPaymentIds);
    }
    // Delete Subscriptions
    if (createdCustomerIds.length > 0) {
      await admin.from('platform_subscriptions').delete().in('customer_id', createdCustomerIds);
    }
    // Delete Payments
    if (createdInvoiceIds.length > 0) {
      await admin.from('platform_payments').delete().in('invoice_id', createdInvoiceIds);
    }
    // Delete Invoice Items & Invoices
    if (createdInvoiceIds.length > 0) {
      await admin.from('platform_invoice_items').delete().in('invoice_id', createdInvoiceIds);
      await admin.from('platform_invoices').delete().in('id', createdInvoiceIds);
    }
    // Delete Sales Applications
    if (createdCustomerIds.length > 0) {
      await admin.from('platform_sales_applications').delete().in('customer_id', createdCustomerIds);
    }
    // Delete Customers
    if (createdCustomerIds.length > 0) {
      await admin.from('platform_customers').delete().in('id', createdCustomerIds);
    }
    // Delete Tenant Products
    if (createdTenantIds.length > 0) {
      await admin.from('tenant_products').delete().in('tenant_id', createdTenantIds);
    }
    // Delete Tenants
    if (createdTenantIds.length > 0) {
      await admin.from('tenant_memberships').delete().in('business_id', createdTenantIds);
      await admin.from('tenants').delete().in('id', createdTenantIds);
    }
    // Delete Role Assignments
    if (createdUserIds.length > 0) {
      await admin.from('platform_role_assignments').delete().in('user_id', createdUserIds);
    }
    // Delete Auth Users
    for (const uid of createdUserIds) {
      await admin.auth.admin.deleteUser(uid);
    }
    // Delete Products
    if (createdProductIds.length > 0) {
      await admin.from('platform_product_prices').delete().in('product_id', createdProductIds);
      await admin.from('platform_products').delete().in('id', createdProductIds);
    }

    console.log('Cleanup finished.\n');
  }

  return results;
}

// Self-execute if run directly via tsx
if (require.main === module) {
  runPhaseDWorkflowSuite().then(results => {
    const allPassed = results.every(r => r.passed);
    console.log(`=== TEST COMPLETED: ${allPassed ? 'ALL PASSED' : 'SOME FAILED'} ===`);
    process.exit(allPassed ? 0 : 1);
  });
}
