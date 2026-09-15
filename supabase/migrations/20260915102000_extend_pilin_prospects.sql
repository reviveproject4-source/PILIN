-- Migration: 20260915102000_extend_pilin_prospects.sql
-- Description: Extend pilin_prospects table with owner, trial, and follow-up tracking fields

ALTER TABLE public.pilin_prospects 
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS employee_count TEXT,
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS trial_status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS last_followed_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_cs_name TEXT;

-- Update constraint if necessary to allow flexible status
ALTER TABLE public.pilin_prospects DROP CONSTRAINT IF EXISTS pilin_prospects_status_check;
ALTER TABLE public.pilin_prospects ADD CONSTRAINT pilin_prospects_status_check 
  CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'DEMO', 'CLOSED_WON', 'CLOSED_LOST', 'PROSPEK BARU', 'SUDAH DIHUBUNGI', 'FOLLOW-UP', 'TRIAL AKTIF', 'TRIAL BERAKHIR', 'BERLANGGANAN', 'TIDAK LANJUT'));

-- RLS Policies for authenticated admin/cs and anon inserts
CREATE POLICY "pilin_prospects_super_admin_select"
ON public.pilin_prospects FOR SELECT TO authenticated
USING (public.auth_is_super_admin() OR public.auth_has_platform_role('sales') OR public.auth_has_platform_role('cs'));

CREATE POLICY "pilin_prospects_super_admin_update"
ON public.pilin_prospects FOR UPDATE TO authenticated
USING (public.auth_is_super_admin() OR public.auth_has_platform_role('sales') OR public.auth_has_platform_role('cs'));

GRANT SELECT, INSERT, UPDATE ON public.pilin_prospects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pilin_prospects TO service_role;
