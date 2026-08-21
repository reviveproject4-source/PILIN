-- Migration: 00018_phase4_hardening.sql
-- Description: Phase 4 Hardening: Communication Preferences, Last Communication Tracking, Uniqueness Constraints, and RLS Security Barrier Views

-- 1. ADD COMMUNICATION PREFERENCES & LAST COMMUNICATION TO CUSTOMERS
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS communication_preference VARCHAR(50) DEFAULT 'ALL' CHECK (communication_preference IN ('TRANSACTIONAL_ONLY', 'RELATIONSHIP_ONLY', 'ALL')),
ADD COLUMN IF NOT EXISTS last_communication_at TIMESTAMPTZ;

-- 2. ADD COMPOSITE UNIQUE CONSTRAINT TO SAPAAN SCHEDULES FOR DATABASE-LEVEL IDEMPOTENCY
ALTER TABLE sapaan_schedules
ADD CONSTRAINT uq_customer_sapaan_cycle UNIQUE (customer_id, sapaan_template_id, schedule_interval_days);

-- 3. RE-CREATE ANALYTICS VIEWS WITH WITH (security_barrier = true) FOR STRICT RLS ISOLATION

-- VIEW: TENANT CUSTOMER RETENTION METRICS (SECURITY BARRIER)
CREATE OR REPLACE VIEW view_tenant_retention_metrics WITH (security_barrier = true) AS
SELECT 
    c.business_id,
    COUNT(DISTINCT c.id) AS total_customers,
    COUNT(DISTINCT CASE WHEN (
        SELECT COUNT(*) FROM transactions t WHERE t.customer_id = c.id AND t.status = 'COMPLETED'
    ) > 1 THEN c.id END) AS repeat_customers,
    ROUND(
        (COUNT(DISTINCT CASE WHEN (
            SELECT COUNT(*) FROM transactions t WHERE t.customer_id = c.id AND t.status = 'COMPLETED'
        ) > 1 THEN c.id END)::NUMERIC / NULLIF(COUNT(DISTINCT c.id), 0)) * 100, 2
    ) AS repeat_customer_rate_percent
FROM customers c
WHERE c.business_id = auth_current_business_id()
GROUP BY c.business_id;

-- VIEW: TOP REVENUE SERVICES (SECURITY BARRIER - COMPLETED ONLY, VOIDED EXCLUDED)
CREATE OR REPLACE VIEW view_top_performing_services WITH (security_barrier = true) AS
SELECT 
    s.business_id,
    s.id AS service_id,
    s.nama AS service_name,
    s.base_harga,
    COALESCE(SUM(ti.qty), 0) AS total_qty_sold,
    COALESCE(SUM(ti.subtotal), 0) AS total_revenue_generated
FROM services s
LEFT JOIN transaction_items ti ON s.id = ti.service_id
LEFT JOIN transactions t ON ti.transaction_id = t.id AND t.status = 'COMPLETED'
WHERE s.business_id = auth_current_business_id()
GROUP BY s.business_id, s.id, s.nama, s.base_harga;
