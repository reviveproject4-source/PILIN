-- Migration: 00010_retention_and_reminders.sql
-- Description: Retention Domain (Reminder Rules & Reminder Scheduling Engine)

-- 1. REMINDER RULES
CREATE TABLE IF NOT EXISTS reminder_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    scope_type VARCHAR(50) NOT NULL DEFAULT 'ALL_BRANCHES' CHECK (scope_type IN ('ALL_BRANCHES', 'SPECIFIC_BRANCH')),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    days_after_transaction INTEGER NOT NULL CHECK (days_after_transaction > 0),
    message_template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT chk_branch_scope_semantics CHECK (
      (scope_type = 'ALL_BRANCHES' AND branch_id IS NULL) OR
      (scope_type = 'SPECIFIC_BRANCH' AND branch_id IS NOT NULL)
    )
);

-- 2. REMINDERS
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    message_body TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_reminder_rules_business ON reminder_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_business ON reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status_due ON reminders(status, due_date);

-- TRIGGER FUNCTION TO VERIFY REMINDER ELIGIBILITY (TRANSACTION STATUS MUST BE 'COMPLETED')
CREATE OR REPLACE FUNCTION verify_reminder_eligibility()
RETURNS TRIGGER AS $$
DECLARE
  v_trans_status VARCHAR(50);
BEGIN
  SELECT status INTO v_trans_status FROM transactions WHERE id = NEW.transaction_id;
  IF v_trans_status IS NULL OR v_trans_status != 'COMPLETED' THEN
    RAISE EXCEPTION 'Reminder can only be created for COMPLETED transactions. Current status: %', v_trans_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verify_reminder_eligibility
BEFORE INSERT ON reminders
FOR EACH ROW EXECUTE FUNCTION verify_reminder_eligibility();

-- ENABLE RLS
ALTER TABLE reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR REMINDER RULES
CREATE POLICY reminder_rules_select_policy ON reminder_rules
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id());

CREATE POLICY reminder_rules_manage_policy ON reminder_rules
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_has_permission('retention:rule:manage'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_has_permission('retention:rule:manage'));

-- POLICIES FOR REMINDERS
CREATE POLICY reminders_select_policy ON reminders
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('retention:reminder:read')
  );

CREATE POLICY reminders_update_policy ON reminders
  FOR UPDATE TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('retention:reminder:send')
  )
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('retention:reminder:send')
  );
