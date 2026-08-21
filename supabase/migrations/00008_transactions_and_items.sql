-- Migration: 00008_transactions_and_items.sql
-- Description: Transactions & Transaction Items (Multi-Item POS, Non-Destructive State Lifecycle)

-- 1. TRANSACTIONS
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    kasir_employee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer')),
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('DRAFT', 'PENDING_PAYMENT', 'COMPLETED', 'VOID_REQUESTED', 'VOIDED')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. TRANSACTION ITEMS
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price NUMERIC(15, 2) NOT NULL CHECK (unit_price >= 0),
    discount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_business_id ON transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_transactions_branch_id ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- PREVENT HARD DELETE TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION prevent_hard_delete_transactions()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Hard DELETE on transactions is prohibited. State transition to VOIDED must be used instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_hard_delete_transactions
BEFORE DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete_transactions();

-- ENABLE RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR TRANSACTIONS
CREATE POLICY transactions_select_policy ON transactions
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('transaction:read')
  );

CREATE POLICY transactions_insert_policy ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('transaction:create')
  );

CREATE POLICY transactions_update_policy ON transactions
  FOR UPDATE TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  )
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );

-- POLICIES FOR TRANSACTION ITEMS
CREATE POLICY transaction_items_select_policy ON transaction_items
  FOR SELECT TO authenticated
  USING (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE business_id = auth_current_business_id() 
        AND auth_user_has_branch_access(branch_id)
        AND auth_has_permission('transaction:read')
    )
  );

CREATE POLICY transaction_items_insert_policy ON transaction_items
  FOR INSERT TO authenticated
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions 
      WHERE business_id = auth_current_business_id() 
        AND auth_user_has_branch_access(branch_id)
        AND auth_has_permission('transaction:create')
    )
  );
