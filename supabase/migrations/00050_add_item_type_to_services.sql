-- Migration: 00050_add_item_type_to_services.sql
-- Description: Add explicit item_type column ('PRODUCT' | 'SERVICE') to services catalog table to reconcile Product vs Service domain concepts

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) NOT NULL DEFAULT 'PRODUCT' CHECK (item_type IN ('PRODUCT', 'SERVICE'));

-- Update existing catalog items if any to proper item_type defaults
UPDATE public.services
SET item_type = 'SERVICE'
WHERE nama ILIKE '%service%' OR nama ILIKE '%grooming%' OR nama ILIKE '%clean%' OR nama ILIKE '%treatment%' OR nama ILIKE '%wash%' OR nama ILIKE '%jasa%';
