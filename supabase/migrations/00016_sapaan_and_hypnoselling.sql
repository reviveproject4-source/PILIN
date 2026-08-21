-- Migration: 00016_sapaan_and_hypnoselling.sql
-- Description: Relationship Domain (Sapaan, Quotes, Hypnoselling Schedules & Templates)

-- 1. SAPAAN & HYPPOSELLING TEMPLATES
CREATE TABLE IF NOT EXISTS sapaan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('SAPAAN', 'QUOTE', 'HYPPOSELLING')),
    title VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    closing_greeting VARCHAR(255) DEFAULT 'Salam hangat dari tim kami' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. SAPAAN SCHEDULES (+15 Days Cycle Post First Successful Reminder)
CREATE TABLE IF NOT EXISTS sapaan_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
    sapaan_template_id UUID REFERENCES sapaan_templates(id) ON DELETE SET NULL,
    schedule_interval_days INTEGER DEFAULT 15 CHECK (schedule_interval_days > 0),
    next_send_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. SAPAAN LOGS
CREATE TABLE IF NOT EXISTS sapaan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    sapaan_schedule_id UUID REFERENCES sapaan_schedules(id) ON DELETE SET NULL,
    message_sent TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED')),
    sent_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_sapaan_templates_business ON sapaan_templates(business_id);
CREATE INDEX IF NOT EXISTS idx_sapaan_schedules_next_send ON sapaan_schedules(status, next_send_at);
CREATE INDEX IF NOT EXISTS idx_sapaan_logs_customer ON sapaan_logs(customer_id);

-- ENABLE RLS
ALTER TABLE sapaan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sapaan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sapaan_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR SAPAAN TEMPLATES
CREATE POLICY sapaan_templates_select_policy ON sapaan_templates
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id());

CREATE POLICY sapaan_templates_manage_policy ON sapaan_templates
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_has_permission('retention:rule:manage'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_has_permission('retention:rule:manage'));

-- POLICIES FOR SAPAAN SCHEDULES
CREATE POLICY sapaan_schedules_select_policy ON sapaan_schedules
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );

-- POLICIES FOR SAPAAN LOGS
CREATE POLICY sapaan_logs_select_policy ON sapaan_logs
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_user_has_branch_access(branch_id)
  );
