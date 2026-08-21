-- Migration: 00012_import_staging.sql
-- Description: Universal Customer Migration Engine Staging & Mapping Schema

-- 1. IMPORT JOBS
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    executed_at_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    source_system VARCHAR(50) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'STAGED' CHECK (status IN ('STAGED', 'MAPPED', 'PROCESSING', 'COMPLETED', 'FAILED')),
    update_policy VARCHAR(50) NOT NULL DEFAULT 'UPDATE_EMPTY_ONLY' CHECK (update_policy IN ('SKIP', 'UPDATE_EMPTY_ONLY', 'OVERWRITE_EXPLICIT', 'MERGE')),
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0,
    duplicate_rows INTEGER DEFAULT 0,
    imported_rows INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. IMPORT ROWS (STAGING AREA)
CREATE TABLE IF NOT EXISTS import_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    raw_data JSONB NOT NULL,
    mapped_data JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VALID', 'INVALID', 'DUPLICATE', 'IMPORTED', 'SKIPPED', 'FAILED')),
    validation_errors JSONB DEFAULT '[]'::jsonb,
    match_action VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. IMPORT PROFILES (REUSABLE MAPPINGS)
CREATE TABLE IF NOT EXISTS import_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    source_system VARCHAR(50) NOT NULL,
    column_mapping JSONB NOT NULL,
    default_update_policy VARCHAR(50) DEFAULT 'UPDATE_EMPTY_ONLY',
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_import_profile UNIQUE (business_id, source_system)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_import_jobs_business ON import_jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_job_status ON import_rows(job_id, status);

-- ENABLE RLS
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_profiles ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR IMPORT JOBS
CREATE POLICY import_jobs_select_policy ON import_jobs
  FOR SELECT TO authenticated
  USING (
    business_id = auth_current_business_id() 
    AND auth_has_permission('customer:import')
  );

CREATE POLICY import_jobs_insert_policy ON import_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    business_id = auth_current_business_id() 
    AND auth_has_permission('customer:import')
  );

-- POLICIES FOR IMPORT ROWS
CREATE POLICY import_rows_select_policy ON import_rows
  FOR SELECT TO authenticated
  USING (
    job_id IN (
      SELECT id FROM import_jobs 
      WHERE business_id = auth_current_business_id() 
        AND auth_has_permission('customer:import')
    )
  );

CREATE POLICY import_rows_insert_policy ON import_rows
  FOR INSERT TO authenticated
  WITH CHECK (
    job_id IN (
      SELECT id FROM import_jobs 
      WHERE business_id = auth_current_business_id() 
        AND auth_has_permission('customer:import')
    )
  );

-- POLICIES FOR IMPORT PROFILES
CREATE POLICY import_profiles_select_policy ON import_profiles
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id());

CREATE POLICY import_profiles_manage_policy ON import_profiles
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_has_permission('customer:import'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_has_permission('customer:import'));
