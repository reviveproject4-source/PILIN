-- Migration: 00011_expenses.sql
-- Description: Finance Domain (Branch Operational Expenses)

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    expense_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_expenses_business_id ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_branch_id ON expenses(branch_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ENABLE RLS
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR EXPENSES
CREATE POLICY expenses_select_policy ON expenses
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );

CREATE POLICY expenses_insert_policy ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('finance:expense:create')
  );
