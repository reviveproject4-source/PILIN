'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    // 1. Authenticate cookie session
    const supabaseServer = createServerClient();
    const { data: { session } } = await supabaseServer.auth.getSession();
    if (!session) {
      return {
        success: false,
        message: 'Unauthorized: Session not found',
        errorCode: 'UNAUTHORIZED_SESSION'
      };
    }

    // 2. Verify platform-level Super Admin authorization via database RPC
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins',
        errorCode: 'UNAUTHORIZED_ROLE'
      };
    }

    // 3. Clean and validate inputs
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

    // 4. Check if tenant code already exists in public.tenants (pre-check before creating auth user)
    const { data: existingTenant, error: checkError } = await supabaseServer
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

    // 5. Fail-safe check: verify if email already exists in auth.users to prevent email conflicts or hijack
    // listUsers handles filtering or listing all registered accounts
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

    // 6. Invite Owner User via Supabase Auth Admin API (sends email invitation, creates user in invited state)
    // Safe: no password passed, Supabase auth handles password definition securely on redirect
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

    // 7. Call database RPC function create_tenant_onboarding (atomic tenant & membership mapping)
    const { data: tenantId, error: rpcError } = await supabaseServer.rpc('create_tenant_onboarding', {
      p_tenant_name: trimmedName,
      p_tenant_code: processedCode,
      p_owner_user_id: newUserId
    });

    if (rpcError || !tenantId) {
      // 8. Rollback: Delete newly created/invited Auth User to prevent orphaned users
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(newUserId);
      if (deleteError) {
        return {
          success: false,
          message: `Database provisioning failed (${rpcError?.message || 'Unknown error'}) and cleanup also failed: ${deleteError.message}. System audit required.`,
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
    const supabaseServer = createServerClient();
    
    // Check if auth session exists
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    // 1. Total Tenants
    const { count: totalTenants, error: totalError } = await supabaseServer
      .from('tenants')
      .select('*', { count: 'exact', head: true });

    // 2. Active Tenants (Count distinct tenants with at least one active product)
    const { data: activeTenantsData, error: activeError } = await supabaseServer
      .from('tenant_products')
      .select('tenant_id')
      .eq('status', 'ACTIVE');

    const uniqueActiveTenants = activeTenantsData
      ? new Set(activeTenantsData.map((tp: any) => tp.tenant_id)).size
      : 0;

    // 3. Active Subscriptions
    const { count: activeSubscriptions, error: subError } = await supabaseServer
      .from('platform_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    // 4. Monthly Revenue (Sum of VERIFIED payments in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: revenueData, error: revError } = await supabaseServer
      .from('platform_payments')
      .select('amount')
      .eq('status', 'VERIFIED')
      .gte('payment_date', thirtyDaysAgo.toISOString());

    const monthlyRevenue = revenueData
      ? revenueData.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
      : 0;

    // 5. Platform Usage (No valid platform-level usage stats table exists; set to null to render "N/A")
    const platformUsage = null;

    if (totalError || activeError || subError || revError) {
      console.error('Super Admin metrics fetch warning:', {
        totalError,
        activeError,
        subError,
        revError
      });
      return {
        success: false,
        message: 'Beberapa metrik gagal diambil secara real-time dari database.'
      };
    }

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
    const supabaseServer = createServerClient();
    
    // Check if auth session exists
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    // 1. Fetch tenant products list
    const { data: tpData, error: tpError } = await supabaseServer
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

    // 2. Fetch subscriptions list
    const { data: subData, error: subError } = await supabaseServer
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
      return {
        success: false,
        message: 'Gagal mengambil data langganan dari database.'
      };
    }

    // Explicit type mapping for clean Next.js action responses
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
    const supabaseServer = createServerClient();
    
    // Check if auth session exists
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    // Call the security definer RPC
    const { data: usersData, error: usersError } = await supabaseServer.rpc('get_platform_users');
    if (usersError) {
      console.error('Super Admin users fetch error:', usersError);
      return {
        success: false,
        message: usersError.message || 'Gagal memuat daftar pengguna platform.'
      };
    }

    const users: PlatformUserData[] = (usersData || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
      last_sign_in_at: u.last_sign_in_at,
      role_code: u.role_code,
      role_name: u.role_name,
      is_active: !!u.is_active
    }));

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
    const supabaseServer = createServerClient();
    
    // Check if auth session exists
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    // Get the UUID of the requested roleCode
    const { data: role, error: roleError } = await supabaseServer
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

    // Upsert into platform_role_assignments (enforces PRIMARY KEY user_id limits)
    const { error: upsertError } = await supabaseServer
      .from('platform_role_assignments')
      .upsert({
        user_id: targetUserId,
        role_id: role.id,
        is_active: true,
        created_by: session?.user?.id // Log actor
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
    const supabaseServer = createServerClient();
    
    // Check if auth session exists
    const { data: { session } } = await supabaseServer.auth.getSession();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    // Enforce revoke by setting is_active = false (No direct DELETE for audit persistence)
    const { error: updateError } = await supabaseServer
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
    const supabaseServer = createServerClient();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const { data, error } = await supabaseServer
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
    const supabaseServer = createServerClient();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    const { data, error } = await supabaseServer
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
    const supabaseServer = createServerClient();
    
    // Security check: Verify Super Admin role
    const { data: isSuperAdmin, error: authError } = await supabaseServer.rpc('auth_is_super_admin');
    if (authError || !isSuperAdmin) {
      return {
        success: false,
        message: 'Unauthorized: Access restricted to platform Super Admins'
      };
    }

    // Validate status values
    if (!['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'].includes(status)) {
      return {
        success: false,
        message: `Invalid activation status: ${status}`
      };
    }

    // Fetch current product activation state to check if activated_at is NULL
    const { data: currentProduct, error: fetchError } = await supabaseServer
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

    const { error } = await supabaseServer
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




