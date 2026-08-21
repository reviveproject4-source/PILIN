-- Migration: 00017_retention_and_intelligence_analytics.sql
-- Description: Intelligence Domain Advanced Analytics & Retention Metrics Views

-- 1. VIEW: TENANT CUSTOMER RETENTION METRICS
CREATE OR REPLACE VIEW view_tenant_retention_metrics AS
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
GROUP BY c.business_id;

-- 2. VIEW: TOP PERFORMING SERVICES BY REVENUE
CREATE OR REPLACE VIEW view_top_performing_services AS
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
GROUP BY s.business_id, s.id, s.nama, s.base_harga;
