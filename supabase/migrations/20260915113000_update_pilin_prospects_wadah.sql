-- Migration: 20260915113000_update_pilin_prospects_wadah.sql
-- Description: Extend pilin_prospects with source, location, next follow-up, and create pilin_prospect_activities table

ALTER TABLE public.pilin_prospects 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'FORM_TRIAL',
  ADD COLUMN IF NOT EXISTS city_area TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS initial_notes TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_follow_up_notes TEXT;

-- Update status constraint to include canonical prospect lifecycle statuses
ALTER TABLE public.pilin_prospects DROP CONSTRAINT IF EXISTS pilin_prospects_status_check;
ALTER TABLE public.pilin_prospects ADD CONSTRAINT pilin_prospects_status_check 
  CHECK (status IN (
    'PROSPEK BARU', 'DIHUBUNGI', 'FOLLOW-UP', 'TERTARIK', 'DEMO / BUSINESS CHECK', 'TRIAL', 'BERLANGGANAN', 'TIDAK LANJUT',
    'NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'CLOSED_WON', 'CLOSED_LOST', 'SUDAH DIHUBUNGI', 'TRIAL AKTIF', 'TRIAL BERAKHIR'
  ));

-- Create prospect activity logs table
CREATE TABLE IF NOT EXISTS public.pilin_prospect_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.pilin_prospects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pic_name TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  notes TEXT NOT NULL,
  result TEXT
);

-- Index for fast lookup by prospect_id and chronological sorting
CREATE INDEX IF NOT EXISTS pilin_prospect_activities_prospect_id_idx 
  ON public.pilin_prospect_activities (prospect_id, created_at DESC);

-- Enable RLS on activities table
ALTER TABLE public.pilin_prospect_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for authenticated platform users (Super Admin, Sales, CS)
DROP POLICY IF EXISTS "pilin_prospect_activities_authenticated_select" ON public.pilin_prospect_activities;
CREATE POLICY "pilin_prospect_activities_authenticated_select"
  ON public.pilin_prospect_activities FOR SELECT TO authenticated
  USING (public.auth_is_super_admin() OR public.auth_has_platform_role('sales') OR public.auth_has_platform_role('cs'));

DROP POLICY IF EXISTS "pilin_prospect_activities_authenticated_insert" ON public.pilin_prospect_activities;
CREATE POLICY "pilin_prospect_activities_authenticated_insert"
  ON public.pilin_prospect_activities FOR INSERT TO authenticated
  WITH CHECK (public.auth_is_super_admin() OR public.auth_has_platform_role('sales') OR public.auth_has_platform_role('cs'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilin_prospect_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pilin_prospect_activities TO service_role;
