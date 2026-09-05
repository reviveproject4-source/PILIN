-- Migration: 00046_add_unit_hpp_to_transaction_items.sql
-- Description: Add unit_hpp snapshot column to transaction_items & update P&L financial view

-- 1. ADD COLUMN TO TRANSACTION_ITEMS
ALTER TABLE public.transaction_items
ADD COLUMN unit_hpp NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (unit_hpp >= 0);

-- 2. UPDATE FINANCIAL VIEW
DROP VIEW IF EXISTS public.view_daily_branch_financials;
CREATE OR REPLACE VIEW view_daily_branch_financials AS
WITH item_hpp AS (
    -- Pre-aggregate HPP per transaction to prevent revenue multiplication when joining items
    SELECT 
        transaction_id,
        COALESCE(SUM(qty * unit_hpp), 0) AS total_trx_hpp
    FROM transaction_items
    GROUP BY transaction_id
),
daily_transactions AS (
    -- Aggregate daily revenue and HPP per branch and business date (WIB / Asia/Jakarta)
    SELECT 
        b.business_id,
        b.id AS branch_id,
        b.name AS branch_name,
        DATE(t.created_at AT TIME ZONE 'Asia/Jakarta') AS report_date,
        COALESCE(SUM(CASE WHEN t.status = 'COMPLETED' THEN t.total_amount ELSE 0 END), 0) AS total_revenue,
        COALESCE(SUM(CASE WHEN t.status = 'COMPLETED' THEN COALESCE(ih.total_trx_hpp, 0) ELSE 0 END), 0) AS total_hpp,
        COALESCE(COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.id END), 0) AS completed_transactions_count
    FROM branches b
    JOIN transactions t ON b.id = t.branch_id
    LEFT JOIN item_hpp ih ON t.id = ih.transaction_id
    GROUP BY b.business_id, b.id, b.name, DATE(t.created_at AT TIME ZONE 'Asia/Jakarta')
),
daily_expenses AS (
    -- Aggregate daily expenses per branch and business date (WIB / Asia/Jakarta)
    SELECT 
        branch_id,
        DATE(expense_date AT TIME ZONE 'Asia/Jakarta') AS report_date,
        COALESCE(SUM(amount), 0) AS total_expenses
    FROM expenses
    GROUP BY branch_id, DATE(expense_date AT TIME ZONE 'Asia/Jakarta')
),
combined_dates AS (
    -- Union distinct branch + report_date combinations across transactions and expenses
    SELECT business_id, branch_id, branch_name, report_date FROM daily_transactions
    UNION
    SELECT b.business_id, b.id AS branch_id, b.name AS branch_name, de.report_date 
    FROM daily_expenses de
    JOIN branches b ON de.branch_id = b.id
)
SELECT 
    cd.business_id,
    cd.branch_id,
    cd.branch_name,
    cd.report_date,
    COALESCE(dt.total_revenue, 0) AS total_revenue,
    COALESCE(dt.total_hpp, 0) AS total_hpp,
    (COALESCE(dt.total_revenue, 0) - COALESCE(dt.total_hpp, 0)) AS gross_profit,
    COALESCE(dt.completed_transactions_count, 0) AS completed_transactions_count,
    COALESCE(de.total_expenses, 0) AS total_expenses,
    (COALESCE(dt.total_revenue, 0) - COALESCE(dt.total_hpp, 0) - COALESCE(de.total_expenses, 0)) AS net_profit
FROM combined_dates cd
LEFT JOIN daily_transactions dt 
    ON cd.branch_id = dt.branch_id AND cd.report_date = dt.report_date
LEFT JOIN daily_expenses de 
    ON cd.branch_id = de.branch_id AND cd.report_date = de.report_date;

