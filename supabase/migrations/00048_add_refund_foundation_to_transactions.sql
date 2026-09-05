-- Migration: 00048_add_refund_foundation_to_transactions.sql
-- Description: Basic Refund Foundation — Add REFUNDED status to transactions status constraint and refund metadata columns

-- 1. DROP EXISTING STATUS CHECK CONSTRAINT & RE-ADD WITH 'REFUNDED'
ALTER TABLE public.transactions
DROP CONSTRAINT IF EXISTS transactions_status_check;

ALTER TABLE public.transactions
ADD CONSTRAINT transactions_status_check
CHECK (status IN ('DRAFT', 'PENDING_PAYMENT', 'COMPLETED', 'VOID_REQUESTED', 'VOIDED', 'REFUNDED'));

-- 2. ADD REFUND METADATA COLUMNS TO TRANSACTIONS
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(15, 2) DEFAULT 0 CHECK (refund_amount >= 0),
ADD COLUMN IF NOT EXISTS refund_reason TEXT,
ADD COLUMN IF NOT EXISTS refund_tier VARCHAR(50) CHECK (refund_tier IS NULL OR refund_tier IN ('TIER_3_MANAGER', 'TIER_2_OWNER')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
