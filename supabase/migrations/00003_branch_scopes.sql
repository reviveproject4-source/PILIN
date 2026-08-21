-- Migration: 00003_branch_scopes.sql
-- Description: Relational Branch Scope Assignment (membership_branch_scopes)

CREATE TABLE IF NOT EXISTS membership_branch_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_membership_branch UNIQUE (membership_id, branch_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_membership_branch_scopes_membership ON membership_branch_scopes(membership_id);
CREATE INDEX IF NOT EXISTS idx_membership_branch_scopes_branch ON membership_branch_scopes(branch_id);
