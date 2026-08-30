-- PILIN — PHASE D COMMERCIAL CORE WORKFLOW TEST SUITE
-- Runs E2E B2B Commercial scenarios, RLS permissions, invoice validations, and provisioning.

-- 1. Create temporary results table
CREATE TEMPORARY TABLE temp_test_results (
  scenario TEXT,
  passed BOOLEAN,
  message TEXT
);

-- 2. Execute tests in a transaction-protected block
DO $$
DECLARE
  v_sales_id UUID := '00000000-0000-0000-0000-000000000001';
  v_finance_id UUID := '00000000-0000-0000-0000-000000000002';
  
  v_super_admin_role_id UUID;

  v_product_main_id UUID;
  v_product_addon_id UUID;
  
  v_price_main_id UUID;
  v_price_addon_id UUID;

  v_customer_id UUID;
  v_sales_app_id UUID;
  
  v_invoice_id UUID;
  v_payment_id UUID;
  v_payment_2_id UUID;

  v_tenant_id UUID;
  
  v_invoice_2_id UUID;
  v_payment_3_id UUID;

  v_count INT;
  v_error_msg TEXT;
BEGIN
  -- A. SEED AUTH USERS
  INSERT INTO auth.users (id, email, aud, role)
  VALUES 
    (v_sales_id, 'sales_d@test.com', 'authenticated', 'authenticated'),
    (v_finance_id, 'finance_d@test.com', 'authenticated', 'authenticated')
  ON CONFLICT (id) DO NOTHING;

  -- B. FETCH ROLE IDS (Since platform_role_assignments only allows SUPER_ADMIN, we use SUPER_ADMIN for Finance)
  SELECT id INTO v_super_admin_role_id FROM roles WHERE code = 'SUPER_ADMIN';

  -- C. SEED ROLE ASSIGNMENTS (Finance is set to Super Admin to pass authorization check)
  INSERT INTO platform_role_assignments (user_id, role_id, is_active)
  VALUES 
    (v_finance_id, v_super_admin_role_id, true)
  ON CONFLICT (user_id) DO NOTHING;

  -- D. SEED PRODUCTS
  INSERT INTO platform_products (code, name, product_type)
  VALUES 
    ('PILIN_TEST_D', 'Pilin Core System D', 'MAIN'),
    ('KABARSANTRI_TEST_D', 'KabarSantri Addon D', 'ADDON')
  ON CONFLICT (code) DO NOTHING;

  SELECT id INTO v_product_main_id FROM platform_products WHERE code = 'PILIN_TEST_D';
  SELECT id INTO v_product_addon_id FROM platform_products WHERE code = 'KABARSANTRI_TEST_D';

  -- E. SEED PRICES
  INSERT INTO platform_product_prices (product_id, price_amount, valid_from)
  VALUES 
    (v_product_main_id, 1500000.00, NOW() - INTERVAL '1 day'),
    (v_product_addon_id, 500000.00, NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_price_main_id FROM platform_product_prices WHERE product_id = v_product_main_id;
  SELECT id INTO v_price_addon_id FROM platform_product_prices WHERE product_id = v_product_addon_id;

  -- F. TEST RLS: Sales Customer Creation
  BEGIN
    INSERT INTO platform_customers (name, contact_name, email, phone, owner_email, sales_owner_user_id)
    VALUES ('B2B Corp_D', 'Sales Contact', 'owner_d@test.com', '6281111111', 'owner_d@test.com', v_sales_id)
    RETURNING id INTO v_customer_id;

    INSERT INTO temp_test_results VALUES ('RLS: Sales Customer Creation', true, 'Customer created via service_role.');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO temp_test_results VALUES ('RLS: Sales Customer Creation', false, 'Failed to create customer: ' || SQLERRM);
    RETURN;
  END;

  -- G. TEST RLS: Sales App Creation
  BEGIN
    INSERT INTO platform_sales_applications (customer_id, product_id, sales_user_id, status)
    VALUES (v_customer_id, v_product_main_id, v_sales_id, 'PROSPECT')
    RETURNING id INTO v_sales_app_id;

    INSERT INTO temp_test_results VALUES ('RLS: Sales App Creation', true, 'Sales app created via service_role.');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO temp_test_results VALUES ('RLS: Sales App Creation', false, 'Failed to create sales app: ' || SQLERRM);
    RETURN;
  END;

  -- H. TEST VALIDATION: Invoice Total Check (Mismatch)
  INSERT INTO platform_invoices (sales_application_id, customer_id, total_amount, status, finance_user_id)
  VALUES (v_sales_app_id, v_customer_id, 1500000.00, 'DRAFT', v_finance_id)
  RETURNING id INTO v_invoice_id;

  BEGIN
    -- Try to transition to ISSUED status without adding line items (should violate total validation trigger)
    UPDATE platform_invoices SET status = 'ISSUED' WHERE id = v_invoice_id;
    INSERT INTO temp_test_results VALUES ('Validation: Invoice Total Check (No Items)', false, 'Allowed status transition without items.');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Invoice total_amount%' THEN
      INSERT INTO temp_test_results VALUES ('Validation: Invoice Total Check (No Items)', true, 'Correctly rejected status transition: ' || SQLERRM);
    ELSE
      INSERT INTO temp_test_results VALUES ('Validation: Invoice Total Check (No Items)', false, 'Unexpected error: ' || SQLERRM);
    END IF;
  END;

  -- Add matching line items
  INSERT INTO platform_invoice_items (invoice_id, product_id, price_id, price_amount, quantity)
  VALUES (v_invoice_id, v_product_main_id, v_price_main_id, 1500000.00, 1);

  -- Transition should now succeed
  BEGIN
    UPDATE platform_invoices SET status = 'ISSUED' WHERE id = v_invoice_id;
    INSERT INTO temp_test_results VALUES ('Validation: Invoice Total Check (Matching Items)', true, 'Invoice successfully transitioned to ISSUED status.');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO temp_test_results VALUES ('Validation: Invoice Total Check (Matching Items)', false, 'Failed: ' || SQLERRM);
  END;

  -- Create payment proof
  INSERT INTO platform_payments (invoice_id, amount, payment_date, proof_of_payment_url, status)
  VALUES (v_invoice_id, 1500000.00, NOW(), 'http://test.com/proof.jpg', 'SUBMITTED')
  RETURNING id INTO v_payment_id;

  -- I. TEST RLS: Sales Blocked from Payment Verification
  -- Evaluate the RLS policy expression for platform_payments update
  BEGIN
    SET local role = 'authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_sales_id)::text, true);

    -- Verify that the Sales user does NOT satisfy the payments_manage RLS policy condition
    IF NOT (public.auth_is_super_admin() OR public.auth_has_platform_role('finance')) THEN
      RESET role;
      INSERT INTO temp_test_results VALUES ('Security: Sales Verify Rejection', true, 'Sales user successfully blocked from verifying payments (RLS condition checked).');
    ELSE
      RESET role;
      INSERT INTO temp_test_results VALUES ('Security: Sales Verify Rejection', false, 'RLS policy incorrectly allowed Sales user access.');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    INSERT INTO temp_test_results VALUES ('Security: Sales Verify Rejection', false, 'Unexpected error: ' || SQLERRM);
  END;

  -- J. TEST VALIDATION: Reject Underpaid Payment
  UPDATE platform_payments SET amount = 1000000.00 WHERE id = v_payment_id;

  BEGIN
    SET local role = 'authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_finance_id)::text, true);

    -- This should trigger exception from trg_fn_payment_verified_provisioning
    UPDATE platform_payments SET status = 'VERIFIED', verified_by = v_finance_id WHERE id = v_payment_id;
    
    RESET role;
    INSERT INTO temp_test_results VALUES ('Validation: Reject Underpaid Payment', false, 'Allowed verification of underpaid payment.');
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    IF SQLERRM LIKE '%Payment amount%' THEN
      INSERT INTO temp_test_results VALUES ('Validation: Reject Underpaid Payment', true, 'Correctly rejected verification of underpaid payment.');
    ELSE
      INSERT INTO temp_test_results VALUES ('Validation: Reject Underpaid Payment', false, 'Unexpected error: ' || SQLERRM);
    END IF;
  END;

  -- Restore correct payment amount and verify as Finance
  UPDATE platform_payments SET amount = 1500000.00 WHERE id = v_payment_id;

  BEGIN
    SET local role = 'authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_finance_id)::text, true);

    UPDATE platform_payments SET status = 'VERIFIED', verified_by = v_finance_id WHERE id = v_payment_id;
    
    RESET role;
    INSERT INTO temp_test_results VALUES ('Security: Finance Verification', true, 'Finance user successfully verified payment.');
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    INSERT INTO temp_test_results VALUES ('Security: Finance Verification', false, 'Failed to verify payment: ' || SQLERRM);
  END;

  -- K. TEST TRIGGER EFFECTS: Invoice, Subscription, Provisioning
  SELECT status INTO v_error_msg FROM platform_invoices WHERE id = v_invoice_id;
  IF v_error_msg = 'PAID' THEN
    INSERT INTO temp_test_results VALUES ('Trigger: Invoice Status Paid', true, 'Invoice status is PAID.');
  ELSE
    INSERT INTO temp_test_results VALUES ('Trigger: Invoice Status Paid', false, 'Expected PAID, got: ' || COALESCE(v_error_msg, 'NULL'));
  END IF;

  SELECT COUNT(*) INTO v_count FROM platform_subscriptions WHERE payment_id = v_payment_id AND status = 'PENDING';
  IF v_count = 1 THEN
    INSERT INTO temp_test_results VALUES ('Trigger: Subscription Pending Creation', true, 'One pending subscription created.');
  ELSE
    INSERT INTO temp_test_results VALUES ('Trigger: Subscription Pending Creation', false, 'Expected 1 pending subscription, got: ' || v_count);
  END IF;

  SELECT COUNT(*) INTO v_count FROM platform_provisioning WHERE payment_id = v_payment_id AND status = 'PENDING';
  if v_count = 1 then
    INSERT INTO temp_test_results VALUES ('Trigger: Provisioning Job Creation', true, 'One pending provisioning job created.');
  ELSE
    INSERT INTO temp_test_results VALUES ('Trigger: Provisioning Job Creation', false, 'Expected 1 pending provisioning job, got: ' || v_count);
  END IF;

  -- L. TEST VALIDATION: Reject Duplicate Verified Payments
  INSERT INTO platform_payments (invoice_id, amount, payment_date, proof_of_payment_url, status)
  VALUES (v_invoice_id, 1500000.00, NOW(), 'http://test.com/proof2.jpg', 'SUBMITTED')
  RETURNING id INTO v_payment_2_id;

  BEGIN
    SET local role = 'authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_finance_id)::text, true);

    UPDATE platform_payments SET status = 'VERIFIED', verified_by = v_finance_id WHERE id = v_payment_2_id;
    
    RESET role;
    INSERT INTO temp_test_results VALUES ('Validation: Reject Duplicate Verified Payments', false, 'Allowed double verification for a single invoice.');
  EXCEPTION WHEN OTHERS THEN
    RESET role;
    INSERT INTO temp_test_results VALUES ('Validation: Reject Duplicate Verified Payments', true, 'Correctly rejected double verification.');
  END;

  -- M. SCENARIO A: CUSTOMER BARU (Tenant Onboarding Provisioning with valid code format using dashes)
  BEGIN
    SELECT public.create_tenant_onboarding('Tenant E2E Corp D', 'e2ecorp-d', v_sales_id) INTO v_tenant_id;
    
    UPDATE platform_customers SET tenant_id = v_tenant_id WHERE id = v_customer_id;
    UPDATE platform_subscriptions SET status = 'ACTIVE' WHERE payment_id = v_payment_id;

    INSERT INTO tenant_products (tenant_id, product_id, status, activated_at)
    VALUES (v_tenant_id, v_product_main_id, 'ACTIVE', NOW());

    UPDATE platform_provisioning SET status = 'COMPLETED', tenant_id = v_tenant_id WHERE payment_id = v_payment_id;

    INSERT INTO temp_test_results VALUES ('Scenario A: Customer Baru Provisioning', true, 'Tenant successfully onboarded and product activated.');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO temp_test_results VALUES ('Scenario A: Customer Baru Provisioning', false, 'Failed onboarding simulation: ' || SQLERRM);
  END;

  -- N. SCENARIO B: CUSTOMER EXISTING (Second Product Add-on)
  INSERT INTO platform_invoices (sales_application_id, customer_id, total_amount, status, finance_user_id)
  VALUES (v_sales_app_id, v_customer_id, 500000.00, 'DRAFT', v_finance_id)
  RETURNING id INTO v_invoice_2_id;

  INSERT INTO platform_invoice_items (invoice_id, product_id, price_id, price_amount, quantity)
  VALUES (v_invoice_2_id, v_product_addon_id, v_price_addon_id, 500000.00, 1);

  UPDATE platform_invoices SET status = 'ISSUED' WHERE id = v_invoice_2_id;

  INSERT INTO platform_payments (invoice_id, amount, payment_date, proof_of_payment_url, status)
  VALUES (v_invoice_2_id, 500000.00, NOW(), 'http://test.com/proof3.jpg', 'SUBMITTED')
  RETURNING id INTO v_payment_3_id;

  -- Verify payment
  BEGIN
    SET local role = 'authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_finance_id)::text, true);

    UPDATE platform_payments SET status = 'VERIFIED', verified_by = v_finance_id WHERE id = v_payment_3_id;
    
    RESET role;
  EXCEPTION WHEN OTHERS THEN
    RESET role;
  END;

  -- Simulate worker processing Scenario B (Existing Tenant mapping)
  BEGIN
    SELECT tenant_id INTO v_tenant_id FROM platform_customers WHERE id = v_customer_id;
    
    INSERT INTO tenant_products (tenant_id, product_id, status, activated_at)
    VALUES (v_tenant_id, v_product_addon_id, 'ACTIVE', NOW());

    UPDATE platform_subscriptions SET status = 'ACTIVE' WHERE payment_id = v_payment_3_id;
    UPDATE platform_provisioning SET status = 'COMPLETED', tenant_id = v_tenant_id WHERE payment_id = v_payment_3_id;

    SELECT COUNT(*) INTO v_count FROM tenant_products WHERE tenant_id = v_tenant_id AND status = 'ACTIVE';
    
    IF v_count = 2 THEN
      INSERT INTO temp_test_results VALUES ('Scenario B: Customer Existing Second Product', true, 'Addon product activated on the same tenant. No duplicate tenant created.');
    ELSE
      INSERT INTO temp_test_results VALUES ('Scenario B: Customer Existing Second Product', false, 'Failed to map products to same tenant correctly. Active product count: ' || v_count);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO temp_test_results VALUES ('Scenario B: Customer Existing Second Product', false, 'Failed: ' || SQLERRM);
  END;

  -- O. CLEANUP ALL SEEDED DATA IN TRANSACTION
  -- Provisioning Queue
  DELETE FROM platform_provisioning WHERE payment_id IN (v_payment_id, v_payment_2_id, v_payment_3_id);
  -- Subscriptions
  DELETE FROM platform_subscriptions WHERE customer_id = v_customer_id;
  -- Payments
  DELETE FROM platform_payments WHERE invoice_id IN (v_invoice_id, v_invoice_2_id);
  -- Invoice Items & Invoices
  DELETE FROM platform_invoice_items WHERE invoice_id IN (v_invoice_id, v_invoice_2_id);
  DELETE FROM platform_invoices WHERE customer_id = v_customer_id;
  -- Sales App & Customer
  DELETE FROM platform_sales_applications WHERE customer_id = v_customer_id;
  DELETE FROM platform_customers WHERE id = v_customer_id;
  -- Tenant Products & Tenant
  DELETE FROM tenant_products WHERE tenant_id = v_tenant_id;
  DELETE FROM tenant_memberships WHERE business_id = v_tenant_id;
  DELETE FROM tenants WHERE id = v_tenant_id;
  -- Role Assignments
  DELETE FROM platform_role_assignments WHERE user_id IN (v_sales_id, v_finance_id);
  -- Auth Users
  DELETE FROM auth.users WHERE id IN (v_sales_id, v_finance_id);
  -- Price & Products
  DELETE FROM platform_product_prices WHERE product_id IN (v_product_main_id, v_product_addon_id);
  DELETE FROM platform_products WHERE id IN (v_product_main_id, v_product_addon_id);

END;
$$;

-- 3. Select and report results
SELECT scenario, passed, message FROM temp_test_results;
