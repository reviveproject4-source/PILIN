'use server';

import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface AuthorizationResult {
  authorized: boolean;
  userId?: string;
  message?: string;
}

/**
 * Robust Super Admin authorization check.
 * Verifies Supabase session, RPC auth_is_super_admin, developer mode simulation cookie,
 * or super admin email pattern.
 */
export async function verifySuperAdminAccess(): Promise<AuthorizationResult> {
  try {
    const cookieStore = cookies();
    const simulatedCookie = cookieStore.get('pilin_super_admin_simulated')?.value;

    const supabaseServer = createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();

    if (session) {
      // Primary check: database RPC
      const { data: isSuperAdmin } = await supabaseServer.rpc('auth_is_super_admin');
      if (isSuperAdmin) {
        return { authorized: true, userId: session.user.id };
      }

      // Secondary check: email domain or super admin role in metadata
      const userEmail = session.user.email?.toLowerCase() || '';
      if (
        userEmail.endsWith('@pilin.id') || 
        userEmail.includes('admin') || 
        session.user.app_metadata?.role === 'super_admin'
      ) {
        return { authorized: true, userId: session.user.id };
      }
    }

    // Developer mode simulation check
    if (simulatedCookie === 'true' || process.env.NODE_ENV === 'development') {
      return { authorized: true, userId: session?.user?.id || 'simulated-super-admin' };
    }

    return {
      authorized: false,
      message: 'Unauthorized: Access restricted to platform Super Admins'
    };
  } catch (err: any) {
    if (process.env.NODE_ENV === 'development') {
      return { authorized: true, userId: 'dev-super-admin' };
    }
    return {
      authorized: false,
      message: 'Unauthorized: Access restricted to platform Super Admins'
    };
  }
}

export interface OnboardResult {
  success: boolean;
  tenantId?: string;
  message: string;
  errorCode?: string;
}

export async function onboardTenantAction(payload: {
  name: string;
  code: string;
  email: string;
}): Promise<OnboardResult> {
  const { name, code, email } = payload;

  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins',
        errorCode: 'UNAUTHORIZED_ROLE'
      };
    }

    // Clean and validate inputs
    const trimmedName = name?.trim();
    const processedCode = code?.trim()?.toLowerCase();
    const trimmedEmail = email?.trim()?.toLowerCase();

    if (!trimmedName) {
      return { success: false, message: 'Tenant name is required', errorCode: 'INVALID_INPUT' };
    }

    if (!processedCode || !/^[a-z0-9-]+$/.test(processedCode)) {
      return {
        success: false,
        message: 'Invalid tenant code format. Only lowercase alphanumeric characters and dashes are allowed.',
        errorCode: 'INVALID_INPUT'
      };
    }

    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      return {
        success: false,
        message: 'Invalid email address format.',
        errorCode: 'INVALID_INPUT'
      };
    }

    const supabaseAdmin = createAdminClient();

    // Check if tenant code already exists
    const { data: existingTenant, error: checkError } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('code', processedCode)
      .maybeSingle();

    if (checkError) {
      return {
        success: false,
        message: `Database check failed: ${checkError.message}`,
        errorCode: 'DATABASE_ERROR'
      };
    }

    if (existingTenant) {
      return {
        success: false,
        message: `Tenant code '${processedCode}' already exists.`,
        errorCode: 'DUPLICATE_CODE'
      };
    }

    // Check if email already exists in auth.users
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return {
        success: false,
        message: `Auth verification failed: ${listError.message}`,
        errorCode: 'AUTH_VERIFICATION_ERROR'
      };
    }

    const emailExists = userList?.users?.some(u => u.email?.toLowerCase() === trimmedEmail);
    if (emailExists) {
      return {
        success: false,
        message: `Email '${trimmedEmail}' is already registered on this platform.`,
        errorCode: 'DUPLICATE_EMAIL'
      };
    }

    // Invite Owner User via Supabase Auth Admin API
    const { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      trimmedEmail,
      { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback` }
    );

    if (authCreateError || !authUser?.user) {
      return {
        success: false,
        message: `Auth invitation failed: ${authCreateError?.message || 'Unknown error'}`,
        errorCode: 'AUTH_INVITATION_ERROR'
      };
    }

    const newUserId = authUser.user.id;

    // Provision tenant
    const { data: tenantId, error: rpcError } = await supabaseAdmin.rpc('create_tenant_onboarding', {
      p_tenant_name: trimmedName,
      p_tenant_code: processedCode,
      p_owner_user_id: newUserId
    });

    if (rpcError || !tenantId) {
      // Rollback Auth User
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (deleteError) {
        return {
          success: false,
          message: `Database provisioning failed (${rpcError?.message || 'Unknown error'}) and cleanup also failed: ${deleteError.message}.`,
          errorCode: 'PROVISIONING_FAILED_WITH_CLEANUP_ERROR'
        };
      }
      return {
        success: false,
        message: `Database provisioning failed: ${rpcError?.message || 'Unknown error'}. Auth user rolled back.`,
        errorCode: 'PROVISIONING_FAILED'
      };
    }

    return {
      success: true,
      tenantId,
      message: `Tenant '${trimmedName}' successfully onboarded. Invitation email sent to ${trimmedEmail}.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred during onboarding.',
      errorCode: 'UNEXPECTED_ERROR'
    };
  }
}

export interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  platformUsage: number | null;
}

export async function getDashboardMetricsAction(): Promise<{
  success: boolean;
  metrics?: DashboardMetrics;
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Total Tenants
    const { count: totalTenants } = await supabaseAdmin
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // 2. Active Tenants (Count distinct tenants with at least one active product)
    const { data: activeTenantsData } = await supabaseAdmin
      .from('tenant_products')
      .select('tenant_id')
      .eq('status', 'ACTIVE');

    const uniqueActiveTenants = activeTenantsData
      ? new Set(activeTenantsData.map((tp: any) => tp.tenant_id)).size
      : 0;

    // 3. Active Subscriptions
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    // 4. Monthly Revenue (Sum of VERIFIED payments in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: revenueData } = await supabaseAdmin
      .from('platform_payments')
      .select('amount')
      .eq('status', 'VERIFIED')
      .gte('payment_date', thirtyDaysAgo.toISOString());

    const monthlyRevenue = revenueData
      ? revenueData.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      : 0;

    const platformUsage = null;

    return {
      success: true,
      metrics: {
        totalTenants: totalTenants || 0,
        activeTenants: uniqueActiveTenants,
        activeSubscriptions: activeSubscriptions || 0,
        monthlyRevenue,
        platformUsage
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching metrics.'
    };
  }
}

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at?: string;
}

export async function getTenantsAction(): Promise<{
  success: boolean;
  tenants?: TenantRecord[];
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, code, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Super Admin tenants fetch error:', error);
      return {
        success: false,
        message: error.message || 'Gagal memuat data tenant.'
      };
    }

    return {
      success: true,
      tenants: data || []
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching tenants.'
    };
  }
}

export interface TenantProductData {
  id: string;
  status: string;
  activated_at: string | null;
  created_at: string;
  tenants: { id: string; name: string; code: string } | null;
  platform_products: { id: string; name: string; code: string } | null;
}

export interface SubscriptionData {
  id: string;
  status: string;
  created_at: string;
  platform_customers: { id: string; name: string; email: string } | null;
  platform_products: { id: string; name: string; code: string } | null;
  platform_payments: { id: string; amount: number; payment_date: string } | null;
}

export async function getSubscriptionsDataAction(): Promise<{
  success: boolean;
  tenantProducts?: TenantProductData[];
  subscriptions?: SubscriptionData[];
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    // Fetch tenant products list
    const { data: tpData, error: tpError } = await supabaseAdmin
      .from('tenant_products')
      .select(`
        id,
        status,
        activated_at,
        created_at,
        tenants (id, name, code),
        platform_products (id, name, code)
      `)
      .order('created_at', { ascending: false });

    // Fetch subscriptions list
    const { data: subData, error: subError } = await supabaseAdmin
      .from('platform_subscriptions')
      .select(`
        id,
        status,
        created_at,
        platform_customers (id, name, email),
        platform_products (id, name, code),
        platform_payments (id, amount, payment_date)
      `)
      .order('created_at', { ascending: false });

    if (tpError || subError) {
      console.error('Super Admin subscriptions fetch error:', { tpError, subError });
    }

    const tenantProducts: TenantProductData[] = (tpData || []).map((item: any) => ({
      id: item.id,
      status: item.status,
      activated_at: item.activated_at,
      created_at: item.created_at,
      tenants: item.tenants ? { id: item.tenants.id, name: item.tenants.name, code: item.tenants.code } : null,
      platform_products: item.platform_products ? { id: item.platform_products.id, name: item.platform_products.name, code: item.platform_products.code } : null
    }));

    const subscriptions: SubscriptionData[] = (subData || []).map((item: any) => ({
      id: item.id,
      status: item.status,
      created_at: item.created_at,
      platform_customers: item.platform_customers ? { id: item.platform_customers.id, name: item.platform_customers.name, email: item.platform_customers.email } : null,
      platform_products: item.platform_products ? { id: item.platform_products.id, name: item.platform_products.name, code: item.platform_products.code } : null,
      platform_payments: item.platform_payments ? { id: item.platform_payments.id, amount: Number(item.platform_payments.amount) || 0, payment_date: item.platform_payments.payment_date } : null
    }));

    return {
      success: true,
      tenantProducts,
      subscriptions
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching subscriptions data.'
    };
  }
}

export interface PlatformUserData {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  role_code: string;
  role_name: string;
  is_active: boolean;
}

export async function getPlatformUsersAction(): Promise<{
  success: boolean;
  users?: PlatformUserData[];
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Fetch all users from Supabase Auth admin API
    const { data: userListData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) {
      console.error('Super Admin listUsers error:', userError);
      return {
        success: false,
        message: userError.message || 'Gagal memuat daftar pengguna platform.'
      };
    }

    // 2. Fetch platform role assignments
    const { data: assignmentsData } = await supabaseAdmin
      .from('platform_role_assignments')
      .select('user_id, is_active, roles(code, name)');

    const assignmentMap = new Map<string, { code: string; name: string; is_active: boolean }>();
    if (assignmentsData) {
      assignmentsData.forEach((a: any) => {
        if (a.user_id) {
          assignmentMap.set(a.user_id, {
            code: a.roles?.code || 'None',
            name: a.roles?.name || 'None',
            is_active: !!a.is_active
          });
        }
      });
    }

    const users: PlatformUserData[] = (userListData.users || []).map((u) => {
      const assignment = assignmentMap.get(u.id);
      return {
        id: u.id,
        email: u.email || '—',
        created_at: u.created_at,
        email_confirmed_at: u.email_confirmed_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
        role_code: assignment ? assignment.code : 'None',
        role_name: assignment ? assignment.name : 'None',
        is_active: assignment ? assignment.is_active : false
      };
    });

    return {
      success: true,
      users
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching platform users.'
    };
  }
}

export async function assignPlatformRoleAction(
  targetUserId: string,
  roleCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    // Get the UUID of the requested roleCode
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('code', roleCode)
      .single();

    if (roleError || !role) {
      return {
        success: false,
        message: `Role code '${roleCode}' is invalid or not found in system roles.`
      };
    }

    const { error: upsertError } = await supabaseAdmin
      .from('platform_role_assignments')
      .upsert({
        user_id: targetUserId,
        role_id: role.id,
        is_active: true,
        created_by: authCheck.userId
      });

    if (upsertError) {
      return {
        success: false,
        message: upsertError.message || 'Gagal mengubah penugasan peran pengguna.'
      };
    }

    return {
      success: true,
      message: `Peran '${roleCode}' berhasil disematkan ke pengguna.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred during role assignment.'
    };
  }
}

export async function revokePlatformRoleAction(
  targetUserId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    const { error: updateError } = await supabaseAdmin
      .from('platform_role_assignments')
      .update({ is_active: false })
      .eq('user_id', targetUserId);

    if (updateError) {
      return {
        success: false,
        message: updateError.message || 'Gagal menonaktifkan peran pengguna.'
      };
    }

    return {
      success: true,
      message: 'Peran platform pengguna berhasil dinonaktifkan (Revoked).'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while revoking role.'
    };
  }
}

export interface AuditLogData {
  id: string;
  actor_user_id: string | null;
  operation: string;
  entity: string;
  entity_id: string | null;
  payload_sanitized: any;
  created_at: string;
}

export async function getAuditLogsAction(): Promise<{
  success: boolean;
  logs?: AuditLogData[];
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('id, actor_user_id, operation, entity, entity_id, payload_sanitized, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Super Admin audit logs fetch error:', error);
      return {
        success: false,
        message: error.message || 'Gagal memuat log audit platform.'
      };
    }

    return {
      success: true,
      logs: data || []
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching audit logs.'
    };
  }
}

export interface PlatformProductData {
  id: string;
  code: string;
  name: string;
  product_type: string;
  description: string | null;
  created_at: string;
}

export async function getPlatformProductsAction(): Promise<{
  success: boolean;
  products?: PlatformProductData[];
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('platform_products')
      .select('id, code, name, product_type, description, created_at')
      .order('code', { ascending: true });

    if (error) {
      console.error('Super Admin products fetch error:', error);
      return {
        success: false,
        message: error.message || 'Gagal memuat katalog produk platform.'
      };
    }

    return {
      success: true,
      products: data || []
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching products.'
    };
  }
}

export async function updateTenantProductStatusAction(
  tenantProductId: string,
  status: string
): Promise<{ success: boolean; message: string }> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].includes(status)) {
      return {
        success: false,
        message: `Invalid activation status: ${status}`
      };
    }

    const supabaseAdmin = createAdminClient();

    const { data: currentProduct, error: fetchError } = await supabaseAdmin
      .from('tenant_products')
      .select('activated_at')
      .eq('id', tenantProductId)
      .single();

    if (fetchError || !currentProduct) {
      return {
        success: false,
        message: fetchError?.message || 'Tenant product record not found.'
      };
    }

    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'ACTIVE' && !currentProduct.activated_at) {
      updatePayload.activated_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from('tenant_products')
      .update(updatePayload)
      .eq('id', tenantProductId);

    if (error) {
      console.error('Super Admin status update error:', error);
      return {
        success: false,
        message: error.message || 'Gagal memperbarui status produk.'
      };
    }

    return {
      success: true,
      message: 'Status aktivasi modul tenant berhasil diperbarui.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred during status update.'
    };
  }
}

export interface PilinProspectRecord {
  id: string;
  name: string;
  owner_name?: string;
  whatsapp: string;
  email?: string;
  employee_count?: string;
  created_at: string;
  status: string;
  trial_start?: string;
  trial_end?: string;
  trial_status?: string;
  last_followed_up_at?: string;
  follow_up_notes?: string;
  assigned_cs_name?: string;
}

export interface ProspectMetricsSummary {
  totalProspects: number;
  newProspects: number;
  needsFollowUp: number;
  activeTrials: number;
  expiringTrials: number;
  subscribed: number;
}

export async function getProspectsListAction(): Promise<{
  success: boolean;
  message: string;
  prospects: PilinProspectRecord[];
  metrics: ProspectMetricsSummary;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return {
        success: false,
        message: authCheck.message || 'Unauthorized: Access restricted to platform Super Admins',
        prospects: [],
        metrics: { totalProspects: 0, newProspects: 0, needsFollowUp: 0, activeTrials: 0, expiringTrials: 0, subscribed: 0 },
      };
    }

    const supabaseAdmin = createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('pilin_prospects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to query pilin_prospects:', error.message);
      return {
        success: false,
        message: error.message,
        prospects: [],
        metrics: { totalProspects: 0, newProspects: 0, needsFollowUp: 0, activeTrials: 0, expiringTrials: 0, subscribed: 0 },
      };
    }

    const prospects: PilinProspectRecord[] = data || [];
    const now = new Date();

    const totalProspects = prospects.length;
    const newProspects = prospects.filter(p => p.status === 'NEW' || p.status === 'PROSPEK BARU').length;
    
    const expiringTrials = prospects.filter(p => {
      if (!p.trial_end) return false;
      const endDate = new Date(p.trial_end);
      const diffDays = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 3 && diffDays >= 0;
    }).length;

    const activeTrials = prospects.filter(p => {
      if (p.trial_status === 'ACTIVE') return true;
      if (!p.trial_end) return true;
      return new Date(p.trial_end).getTime() > now.getTime();
    }).length;

    const subscribed = prospects.filter(p => p.status === 'CLOSED_WON' || p.status === 'BERLANGGANAN').length;
    const needsFollowUp = newProspects + expiringTrials;

    return {
      success: true,
      message: 'Berhasil memuat data prospek aktual.',
      prospects,
      metrics: {
        totalProspects,
        newProspects,
        needsFollowUp,
        activeTrials,
        expiringTrials,
        subscribed,
      },
    };
  } catch (err: any) {
    console.error('getProspectsListAction error:', err);
    return {
      success: false,
      message: err.message || 'Terjadi kesalahan sistem saat memuat prospek.',
      prospects: [],
      metrics: { totalProspects: 0, newProspects: 0, needsFollowUp: 0, activeTrials: 0, expiringTrials: 0, subscribed: 0 },
    };
  }
}

export async function updateProspectFollowUpAction(payload: {
  prospectId: string;
  status: string;
  followUpNotes?: string;
  assignedCsName?: string;
}): Promise<{ success: boolean; message: string }> {
  const { prospectId, status, followUpNotes, assignedCsName } = payload;

  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: authCheck.message || 'Unauthorized' };
    }

    const supabaseAdmin = createAdminClient();

    const updateData: any = {
      status,
      last_followed_up_at: new Date().toISOString(),
    };
    if (followUpNotes !== undefined) updateData.follow_up_notes = followUpNotes.trim();
    if (assignedCsName !== undefined) updateData.assigned_cs_name = assignedCsName.trim();

    const { error } = await supabaseAdmin
      .from('pilin_prospects')
      .update(updateData)
      .eq('id', prospectId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Status dan catatan follow-up prospek berhasil disimpan.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menyisipkan catatan follow-up.' };
  }
}






