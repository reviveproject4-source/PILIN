-- Migration: 00009_control_and_audit.sql
-- Description: Control Workflows (Void Request Approval) & Sanitized Audit Logs

-- 1. TRANSACTION VOID/DELETE REQUESTS
CREATE TABLE IF NOT EXISTS transaction_delete_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    requester_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approval_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    action_at TIMESTAMPTZ
);

-- 2. AUDIT LOGS (Centralized Security & State Mutation Audit)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operation VARCHAR(100) NOT NULL, -- e.g. 'TRANSACTION_VOID_REQUESTED', 'CUSTOMER_IMPORTED'
    entity VARCHAR(100) NOT NULL,    -- e.g. 'transactions', 'customers'
    entity_id UUID,
    payload_sanitized JSONB DEFAULT '{}'::jsonb, -- Masked/sanitized data (NO PII/PASSWORDS)
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_trans_del_req_business ON transaction_delete_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_trans_del_req_branch ON transaction_delete_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_trans_del_req_status ON transaction_delete_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ENABLE RLS
ALTER TABLE transaction_delete_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR VOID REQUESTS
CREATE POLICY trans_del_req_select_policy ON transaction_delete_requests
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );

CREATE POLICY trans_del_req_insert_policy ON transaction_delete_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('transaction:void_request')
  );

CREATE POLICY trans_del_req_update_policy ON transaction_delete_requests
  FOR UPDATE TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('transaction:void_approve')
  )
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
    AND auth_has_permission('transaction:void_approve')
  );

-- POLICIES FOR AUDIT LOGS (Read for Owner/Control permission, Insert for all authenticated via Audit Engine)
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_has_permission('control:audit:view')
  );

CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id()
  );
