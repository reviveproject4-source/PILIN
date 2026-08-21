-- Migration: 00014_finance_reporting.sql
-- Description: Finance Reporting Views & Calculations (P&L, Cash Flow Overview)

-- VIEW: DAILY BRANCH FINANCIAL SUMMARY (P&L BASE)
CREATE OR REPLACE VIEW view_daily_branch_financials AS
SELECT 
    b.business_id,
    b.id AS branch_id,
    b.name AS branch_name,
    DATE(t.created_at) AS report_date,
    COALESCE(SUM(CASE WHEN t.status = 'COMPLETED' THEN t.total_amount ELSE 0 END), 0) AS total_revenue,
    COALESCE(COUNT(CASE WHEN t.status = 'COMPLETED' THEN 1 END), 0) AS completed_transactions_count,
    COALESCE((
        SELECT SUM(e.amount) 
        FROM expenses e 
        WHERE e.branch_id = b.id AND DATE(e.expense_date) = DATE(t.created_at)
    ), 0) AS total_expenses,
    (
        COALESCE(SUM(CASE WHEN t.status = 'COMPLETED' THEN t.total_amount ELSE 0 END), 0) -
        COALESCE((
            SELECT SUM(e.amount) 
            FROM expenses e 
            WHERE e.branch_id = b.id AND DATE(e.expense_date) = DATE(t.created_at)
        ), 0)
    ) AS net_profit
FROM branches b
LEFT JOIN transactions t ON b.id = t.branch_id
GROUP BY b.business_id, b.id, b.name, DATE(t.created_at);
