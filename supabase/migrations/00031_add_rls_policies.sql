-- 00012_add_rls_policies.sql
-- Row‑Level Security policies for tenant_feature_flags.
-- SUPER_ADMIN (must have feature:manage permission) gets full CRUD.
-- Tenant users get read‑only SELECT on their own tenant rows.

-- 1️⃣ SUPER_ADMIN full SELECT
CREATE POLICY ff_super_admin_select ON tenant_feature_flags
FOR SELECT USING (
  public.auth_is_super_admin() AND auth_has_permission('feature:manage')
);

-- 2️⃣ SUPER_ADMIN INSERT
CREATE POLICY ff_super_admin_insert ON tenant_feature_flags
FOR INSERT WITH CHECK (
  public.auth_is_super_admin() AND auth_has_permission('feature:manage')
);

-- 3️⃣ SUPER_ADMIN UPDATE
CREATE POLICY ff_super_admin_update ON tenant_feature_flags
FOR UPDATE USING (
  public.auth_is_super_admin() AND auth_has_permission('feature:manage')
) WITH CHECK (
  public.auth_is_super_admin() AND auth_has_permission('feature:manage')
);

-- 4️⃣ SUPER_ADMIN DELETE
CREATE POLICY ff_super_admin_delete ON tenant_feature_flags
FOR DELETE USING (
  public.auth_is_super_admin() AND auth_has_permission('feature:manage')
);

-- 5️⃣ Tenant‑user SELECT only on own tenant
CREATE POLICY ff_tenant_select ON tenant_feature_flags
FOR SELECT USING (
  auth_current_business_id() = tenant_id
);

-- No INSERT/UPDATE/DELETE policies for tenant users – they are denied by default.
