-- Migration: 00005_rls_security_functions.sql
-- Description: RLS Helper Functions & Security Gate Enforcement

-- 1. Helper: Get Current User's Active Business ID
CREATE OR REPLACE FUNCTION auth_current_business_id()
RETURNS UUID AS $$
  SELECT business_id 
  FROM tenant_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Helper: Get Current User's Active Membership ID
CREATE OR REPLACE FUNCTION auth_current_membership_id()
RETURNS UUID AS $$
  SELECT id 
  FROM tenant_memberships 
  WHERE user_id = auth.uid() 
    AND is_active = true 
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Helper: Check if Current User is Owner
CREATE OR REPLACE FUNCTION auth_is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tenant_memberships tm
    JOIN roles r ON tm.role_id = r.id
    WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND (r.code = 'owner' OR tm.is_tenant_wide = true)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Helper: Check if Current User Has Specific Permission
CREATE OR REPLACE FUNCTION auth_has_permission(p_code TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tenant_memberships tm
    JOIN role_permissions rp ON tm.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND p.code = p_code
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 5. Helper: Check if Current User Has Access to Specific Branch
CREATE OR REPLACE FUNCTION auth_user_has_branch_access(p_branch_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tenant_memberships tm
    LEFT JOIN membership_branch_scopes mbs ON tm.id = mbs.membership_id
    WHERE tm.user_id = auth.uid() 
      AND tm.is_active = true 
      AND (tm.is_tenant_wide = true OR mbs.branch_id = p_branch_id)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ENABLE RLS ON ORG & SECURITY TABLES
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_branch_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR TENANTS
CREATE POLICY tenants_select_policy ON tenants
  FOR SELECT TO authenticated
  USING (id = auth_current_business_id());

-- POLICIES FOR BRANCHES
CREATE POLICY branches_select_policy ON branches
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id() AND auth_user_has_branch_access(id));

CREATE POLICY branches_manage_policy ON branches
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_has_permission('org:branch:manage'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_has_permission('org:branch:manage'));

-- POLICIES FOR MEMBERSHIPS
CREATE POLICY memberships_select_policy ON tenant_memberships
  FOR SELECT TO authenticated
  USING (business_id = auth_current_business_id());

CREATE POLICY memberships_manage_policy ON tenant_memberships
  FOR ALL TO authenticated
  USING (business_id = auth_current_business_id() AND auth_has_permission('org:employee:manage'))
  WITH CHECK (business_id = auth_current_business_id() AND auth_has_permission('org:employee:manage'));

-- POLICIES FOR BRANCH SCOPES
CREATE POLICY branch_scopes_select_policy ON membership_branch_scopes
  FOR SELECT TO authenticated
  USING (
    membership_id IN (
      SELECT id FROM tenant_memberships WHERE business_id = auth_current_business_id()
    )
  );

-- POLICIES FOR ROLES & PERMISSIONS (Static Read Access for Authenticated Users)
CREATE POLICY roles_select_policy ON roles FOR SELECT TO authenticated USING (true);
CREATE POLICY permissions_select_policy ON permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY role_permissions_select_policy ON role_permissions FOR SELECT TO authenticated USING (true);
