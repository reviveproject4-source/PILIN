-- Migration: 00037_commercial_core_v1.sql
-- Description: Implement B2B Commercial Core V1 database objects, RLS, and triggers

-- 1. platform_products
CREATE TABLE IF NOT EXISTS platform_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    product_type VARCHAR(50) DEFAULT 'MAIN' NOT NULL CHECK (product_type IN ('MAIN', 'ADDON')),
    parent_product_id UUID REFERENCES platform_products(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. platform_customers
CREATE TABLE IF NOT EXISTS platform_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    tenant_id UUID UNIQUE REFERENCES tenants(id) ON DELETE SET NULL,
    sales_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. platform_product_prices
CREATE TABLE IF NOT EXISTS platform_product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE CASCADE,
    price_amount NUMERIC(12,2) NOT NULL,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. platform_sales_applications
CREATE TABLE IF NOT EXISTS platform_sales_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES platform_customers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE RESTRICT,
    sales_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'PROSPECT' CHECK (status IN ('PROSPECT', 'DEMO', 'CLOSED_WON', 'CLOSED_LOST')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. platform_demos
CREATE TABLE IF NOT EXISTS platform_demos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_application_id UUID NOT NULL REFERENCES platform_sales_applications(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED')),
    demo_result VARCHAR(50) CHECK (demo_result IN ('INTERESTED', 'NOT_INTERESTED', 'FOLLOW_UP')),
    demo_date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. platform_invoices
CREATE TABLE IF NOT EXISTS platform_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_application_id UUID NOT NULL REFERENCES platform_sales_applications(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES platform_customers(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED')),
    finance_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. platform_invoice_items
CREATE TABLE IF NOT EXISTS platform_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES platform_invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE RESTRICT,
    price_id UUID NOT NULL REFERENCES platform_product_prices(id) ON DELETE RESTRICT,
    price_amount NUMERIC(12,2) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 8. platform_payments
CREATE TABLE IF NOT EXISTS platform_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES platform_invoices(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL,
    payment_date TIMESTAMPTZ NOT NULL,
    proof_of_payment_url VARCHAR(512) NOT NULL,
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED')),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. platform_subscriptions
CREATE TABLE IF NOT EXISTS platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES platform_customers(id) ON DELETE RESTRICT,
    product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE RESTRICT,
    payment_id UUID NOT NULL REFERENCES platform_payments(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_sub_payment UNIQUE (payment_id, product_id)
);

-- 10. platform_provisioning
CREATE TABLE IF NOT EXISTS platform_provisioning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID UNIQUE NOT NULL REFERENCES platform_payments(id) ON DELETE RESTRICT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    retry_count INTEGER DEFAULT 0 NOT NULL,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 11. tenant_products
CREATE TABLE IF NOT EXISTS tenant_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES platform_products(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED')),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_tenant_product UNIQUE (tenant_id, product_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_platform_customers_tenant_id ON platform_customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_customers_sales_owner ON platform_customers(sales_owner_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_product_prices_product_id ON platform_product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_platform_sales_apps_customer ON platform_sales_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_sales_apps_sales ON platform_sales_applications(sales_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_demos_app_id ON platform_demos(sales_application_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_customer ON platform_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoice_items_invoice ON platform_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_invoice ON platform_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_customer ON platform_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_payment ON platform_subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_platform_provisioning_payment ON platform_provisioning(payment_id);
CREATE INDEX IF NOT EXISTS idx_tenant_products_tenant ON tenant_products(tenant_id);

-- Enforce ONE verified payment per invoice to prevent duplicate payments
CREATE UNIQUE INDEX IF NOT EXISTS uq_verified_payment_per_invoice ON platform_payments(invoice_id) WHERE (status = 'VERIFIED');

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE platform_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sales_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_demos ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_provisioning ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_products ENABLE ROW LEVEL SECURITY;

-- AUTHORIZATION HELPER FUNCTION USING ACTUAL pra -> roles ID relation
CREATE OR REPLACE FUNCTION public.auth_has_platform_role(p_role VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM platform_role_assignments pra
    JOIN roles r ON pra.role_id = r.id
    WHERE pra.user_id = auth.uid() 
      AND pra.is_active = true
      AND r.code = p_role
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog;

-- RLS POLICIES

-- platform_products
CREATE POLICY products_select ON platform_products
  FOR SELECT TO authenticated USING (true);
CREATE POLICY products_manage ON platform_products
  FOR ALL TO authenticated USING (public.auth_is_super_admin());

-- platform_product_prices
CREATE POLICY prices_select ON platform_product_prices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY prices_manage ON platform_product_prices
  FOR ALL TO authenticated USING (public.auth_is_super_admin() OR public.auth_has_platform_role('finance'));

-- platform_customers
CREATE POLICY customers_select ON platform_customers
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('finance') 
    OR sales_owner_user_id = auth.uid()
  );
CREATE POLICY customers_insert ON platform_customers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('sales')
  );
CREATE POLICY customers_update ON platform_customers
  FOR UPDATE TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR sales_owner_user_id = auth.uid()
  );

-- platform_sales_applications
CREATE POLICY sales_apps_select ON platform_sales_applications
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('finance') 
    OR sales_user_id = auth.uid()
  );
CREATE POLICY sales_apps_insert ON platform_sales_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('sales')
  );
CREATE POLICY sales_apps_update ON platform_sales_applications
  FOR UPDATE TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR sales_user_id = auth.uid()
  );

-- platform_demos
CREATE POLICY demos_select ON platform_demos
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR EXISTS (
      SELECT 1 FROM platform_sales_applications sa
      WHERE sa.id = sales_application_id 
        AND (sa.sales_user_id = auth.uid() OR public.auth_has_platform_role('finance'))
    )
  );
CREATE POLICY demos_write ON platform_demos
  FOR ALL TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR EXISTS (
      SELECT 1 FROM platform_sales_applications sa
      WHERE sa.id = sales_application_id AND sa.sales_user_id = auth.uid()
    )
  );

-- platform_invoices
CREATE POLICY invoices_select ON platform_invoices
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('finance') 
    OR finance_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_sales_applications sa
      WHERE sa.id = sales_application_id AND sa.sales_user_id = auth.uid()
    )
  );
CREATE POLICY invoices_manage ON platform_invoices
  FOR ALL TO authenticated
  USING (public.auth_is_super_admin() OR public.auth_has_platform_role('finance'));

-- platform_invoice_items
CREATE POLICY invoice_items_select ON platform_invoice_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_invoices inv
      WHERE inv.id = invoice_id
        AND (
          public.auth_is_super_admin()
          OR public.auth_has_platform_role('finance')
          OR EXISTS (
            SELECT 1 FROM platform_sales_applications sa
            WHERE sa.id = inv.sales_application_id AND sa.sales_user_id = auth.uid()
          )
        )
    )
  );
CREATE POLICY invoice_items_manage ON platform_invoice_items
  FOR ALL TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('finance')
  );

-- platform_payments
CREATE POLICY payments_select ON platform_payments
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin()
    OR public.auth_has_platform_role('finance')
    OR EXISTS (
      SELECT 1 FROM platform_invoices inv
      JOIN platform_sales_applications sa ON inv.sales_application_id = sa.id
      WHERE inv.id = invoice_id AND sa.sales_user_id = auth.uid()
    )
  );
CREATE POLICY payments_manage ON platform_payments
  FOR ALL TO authenticated
  USING (
    public.auth_is_super_admin() 
    OR public.auth_has_platform_role('finance')
  );

-- platform_subscriptions
CREATE POLICY subscriptions_select ON platform_subscriptions
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin()
    OR public.auth_has_platform_role('finance')
    OR EXISTS (
      SELECT 1 FROM platform_customers c
      WHERE c.id = customer_id AND c.sales_owner_user_id = auth.uid()
    )
  );
CREATE POLICY subscriptions_system ON platform_subscriptions
  FOR ALL TO authenticated
  USING (public.auth_is_super_admin());

-- platform_provisioning
CREATE POLICY provisioning_select ON platform_provisioning
  FOR SELECT TO authenticated
  USING (public.auth_is_super_admin());
CREATE POLICY provisioning_write ON platform_provisioning
  FOR ALL TO authenticated
  USING (public.auth_is_super_admin());

-- tenant_products
CREATE POLICY tenant_products_select ON tenant_products
  FOR SELECT TO authenticated
  USING (
    public.auth_is_super_admin()
    OR EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.business_id = tenant_id AND tm.user_id = auth.uid() AND tm.is_active = true
    )
  );
CREATE POLICY tenant_products_write ON tenant_products
  FOR ALL TO authenticated
  USING (public.auth_is_super_admin());

-- INVOICE ITEMS SUM VALIDATION TRIGGER (BEFORE ISSUANCE)
CREATE OR REPLACE FUNCTION public.trg_fn_validate_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
  v_items_sum NUMERIC(12,2);
BEGIN
  -- Validate invoice total amount when transitioning out of DRAFT state
  IF NEW.status <> 'DRAFT' THEN
    SELECT COALESCE(SUM(price_amount * quantity), 0.00) INTO v_items_sum
    FROM platform_invoice_items
    WHERE invoice_id = NEW.id;

    IF NEW.total_amount <> v_items_sum THEN
      RAISE EXCEPTION 'Invoice total_amount (%) does not match the sum of invoice items (%)', NEW.total_amount, v_items_sum
        USING ERRCODE = '22000';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

CREATE TRIGGER trg_validate_invoice_total
  BEFORE INSERT OR UPDATE OF status, total_amount ON platform_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_validate_invoice_total();

-- AUTOMATED PAYMENT PROVISIONING JOB TRIGGER
CREATE OR REPLACE FUNCTION public.trg_fn_payment_verified_provisioning()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_id UUID;
  v_customer_id UUID;
  v_invoice_total NUMERIC(12,2);
  v_item_record RECORD;
BEGIN
  -- Trigger runs only when status transitions to 'VERIFIED'
  IF NEW.status = 'VERIFIED' AND (OLD.status IS NULL OR OLD.status <> 'VERIFIED') THEN
    v_invoice_id := NEW.invoice_id;

    -- Fetch invoice details
    SELECT customer_id, total_amount INTO v_customer_id, v_invoice_total
    FROM platform_invoices
    WHERE id = v_invoice_id;

    -- Validate payment amount satisfies invoice total amount (prevent under-payment)
    IF NEW.amount < v_invoice_total THEN
      RAISE EXCEPTION 'Payment amount (%) is less than the invoice total amount (%)', NEW.amount, v_invoice_total
        USING ERRCODE = '22000';
    END IF;

    -- 1. Update Invoice status to PAID
    UPDATE platform_invoices
    SET status = 'PAID', updated_at = NOW()
    WHERE id = v_invoice_id;

    -- 2. Create platform_subscriptions for each invoice item (Worker can query all where payment_id = NEW.id)
    FOR v_item_record IN 
      SELECT product_id 
      FROM platform_invoice_items 
      WHERE invoice_id = v_invoice_id
    LOOP
      INSERT INTO platform_subscriptions (customer_id, product_id, payment_id, status)
      VALUES (v_customer_id, v_item_record.product_id, NEW.id, 'PENDING');
    END LOOP;

    -- 3. Insert a single record into platform_provisioning queue referencing this transaction
    INSERT INTO platform_provisioning (payment_id, status)
    VALUES (NEW.id, 'PENDING');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog;

CREATE TRIGGER trg_payment_verified_provisioning
  AFTER UPDATE OF status ON platform_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_payment_verified_provisioning();
