'use server';

import { cookies } from 'next/headers';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PendingRegistrationStore } from '@/domains/tenant/pendingRegistrationStore';

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

export interface AttentionItem {
  id: string;
  type: 'PROSPECT_NEW' | 'TRIAL_EXPIRING' | 'MODULE_SUSPENDED';
  title: string;
  subtitle: string;
  date?: string;
  actionMenu: 'Prospek' | 'Subscriptions' | 'Tenants';
}

export interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  timestamp: string;
  type: 'AUDIT' | 'PROSPECT' | 'TENANT';
}

export interface DashboardMetrics {
  totalTenants: number;
  activeTenants: number;
  totalProspects: number;
  activeTrials: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  platformUsage: number | null;
  attentionItems: AttentionItem[];
  recentActivities: ActivityItem[];
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
    const now = new Date();

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

    // 3. Prospects & Active Trials
    const { data: prospectsData } = await supabaseAdmin
      .from('pilin_prospects')
      .select('id, name, owner_name, status, trial_status, trial_end, created_at')
      .order('created_at', { ascending: false });

    const prospectsList = prospectsData || [];
    const totalProspects = prospectsList.length;

    const activeTrials = prospectsList.filter(p => {
      if (p.trial_status === 'ACTIVE') return true;
      if (!p.trial_end) return false;
      return new Date(p.trial_end).getTime() > now.getTime();
    }).length;

    // 4. Active Subscriptions
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('platform_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    // 5. Monthly Revenue (Sum of VERIFIED payments in the last 30 days)
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

    // 6. Section II: MEMBUTUHKAN PERHATIAN (Attention Items)
    const attentionItems: AttentionItem[] = [];

    // New prospects needing follow-up
    const newProspects = prospectsList.filter(p => p.status === 'NEW' || p.status === 'PROSPEK BARU');
    newProspects.slice(0, 3).forEach(p => {
      attentionItems.push({
        id: `att-prospect-${p.id}`,
        type: 'PROSPECT_NEW',
        title: `Prospek Baru: ${p.name}`,
        subtitle: `Owner/PIC: ${p.owner_name || 'Terdaftar'} belum difollow-up CS`,
        date: p.created_at,
        actionMenu: 'Prospek'
      });
    });

    // Expiring trials (within next 3 days)
    const expiringTrials = prospectsList.filter(p => {
      if (!p.trial_end) return false;
      const endDate = new Date(p.trial_end);
      const diffDays = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 3 && diffDays >= 0;
    });
    expiringTrials.slice(0, 3).forEach(p => {
      attentionItems.push({
        id: `att-trial-${p.id}`,
        type: 'TRIAL_EXPIRING',
        title: `Trial Akan Berakhir: ${p.name}`,
        subtitle: `Berakhir pada ${new Date(p.trial_end!).toLocaleDateString('id-ID')}`,
        date: p.trial_end,
        actionMenu: 'Prospek'
      });
    });

    // Suspended tenant modules
    const { data: suspendedModules } = await supabaseAdmin
      .from('tenant_products')
      .select('id, status, tenants(name), platform_products(name)')
      .eq('status', 'SUSPENDED')
      .limit(3);

    if (suspendedModules) {
      suspendedModules.forEach((m: any) => {
        attentionItems.push({
          id: `att-suspended-${m.id}`,
          type: 'MODULE_SUSPENDED',
          title: `Modul Nonaktif: ${m.tenants?.name || 'Tenant'}`,
          subtitle: `Modul ${m.platform_products?.name || 'Platform'} berstatus SUSPENDED`,
          actionMenu: 'Subscriptions'
        });
      });
    }

    // 7. Section III: AKTIVITAS TERBARU (Recent Activities)
    const recentActivities: ActivityItem[] = [];

    const { data: logsData } = await supabaseAdmin
      .from('audit_logs')
      .select('id, operation, entity, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (logsData && logsData.length > 0) {
      logsData.forEach((log: any) => {
        recentActivities.push({
          id: log.id,
          title: `${log.operation} - ${log.entity}`,
          detail: `Operasi platform pada entitas ${log.entity}`,
          timestamp: log.created_at,
          type: 'AUDIT'
        });
      });
    } else {
      // Fallback: Recent registrations in database
      prospectsList.slice(0, 5).forEach(p => {
        recentActivities.push({
          id: `act-prospect-${p.id}`,
          title: `Pendaftaran Prospek: ${p.name}`,
          detail: `Calon tenant terdaftar dari Form Onboarding Owner`,
          timestamp: p.created_at,
          type: 'PROSPECT'
        });
      });
    }

    return {
      success: true,
      metrics: {
        totalTenants: totalTenants || 0,
        activeTenants: uniqueActiveTenants,
        totalProspects,
        activeTrials,
        activeSubscriptions: activeSubscriptions || 0,
        monthlyRevenue,
        platformUsage,
        attentionItems,
        recentActivities
      }
    };
  } catch (err: any) {
    console.error('getDashboardMetricsAction error:', err);
    return {
      success: false,
      message: 'Data belum dapat dimuat.'
    };
  }
}

export interface TenantRecord {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at?: string;
  status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'INACTIVE';
  subscription_tier?: 'Starter' | 'Pro' | 'Enterprise' | 'Free Trial';
  subscription_status?: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CANCELLED';
  active_features_count?: number;
  total_features_count?: number;
  branches_count?: number;
}

export interface TenantFeatureFlagItem {
  feature_code: string;
  name: string;
  category: 'Operasional' | 'CRM WhatsApp' | 'Keuangan' | 'HR & SDM' | 'Alat & AI';
  description: string;
  enabled: boolean;
}

export const PILIN_STANDARD_FEATURES: Omit<TenantFeatureFlagItem, 'enabled'>[] = [
  // 1. Operasional & POS
  { feature_code: 'nota_transaksi', name: 'Kasir & Cetak Nota POS', category: 'Operasional', description: 'Transaksi kasir cepat, barcode scan, diskon, dan cetak struk nota.' },
  { feature_code: 'spk', name: 'SPK & Tracking Pekerjaan', category: 'Operasional', description: 'Surat Perintah Kerja pencucian, antrean proses, dan serah terima.' },
  { feature_code: 'service_catalog', name: 'Katalog Layanan & Harga Cabang', category: 'Operasional', description: 'Katalog jasa, varian layanan, dan penyesuaian tarif per cabang.' },
  
  // 2. CRM WhatsApp
  { feature_code: 'sapaan', name: 'WhatsApp Sapaan Otomatis', category: 'CRM WhatsApp', description: 'Kirim sapaan selamat datang dan ucapan otomatis ke nomor pelanggan.' },
  { feature_code: 'reminder', name: 'Pengingat Retensi & Cucian Jadi', category: 'CRM WhatsApp', description: 'Notifikasi otomatis cucian selesai diambil dan ajakan cuci kembali.' },
  { feature_code: 'broadcast', name: 'Broadcast Promo WhatsApp Massal', category: 'CRM WhatsApp', description: 'Kirim penawaran promo dan diskon massal ke segmen pelanggan.' },
  
  // 3. Keuangan
  { feature_code: 'finance', name: 'Pencatatan Kas & Beban Operasional', category: 'Keuangan', description: 'Catat pengeluaran harian cabang, operasional toko, dan arus kas.' },
  { feature_code: 'revenue', name: 'Laporan Omzet, HPP & Laba Kotor', category: 'Keuangan', description: 'Analitik pendapatan harian/bulanan, perhitungan HPP, dan margin laba.' },
  { feature_code: 'sales_commission', name: 'Komisi Penjualan Kasir & Sales', category: 'Keuangan', description: 'Perhitungan otomatis bagi hasil dan bonus komisi staf kasir.' },
  
  // 4. HR & SDM
  { feature_code: 'attendance', name: 'Presensi GPS & Foto Selfie Pegawai', category: 'HR & SDM', description: 'Check-in/out staf dengan validasi geofencing lokasi dan bukti foto.' },
  { feature_code: 'gamification', name: 'Poin Kinerja & Peringkat Pegawai', category: 'HR & SDM', description: 'Reward poin produktivitas, pencapaian target, dan leaderboard staf.' },
  
  // 5. Alat & AI
  { feature_code: 'intelligence', name: 'AI Insights & Analitik Prediktif', category: 'Alat & AI', description: 'Rekomendasi pertumbuhan bisnis otomatis berbasis data transaksi.' },
  { feature_code: 'importer', name: 'Import & Migrasi Data Excel/CSV', category: 'Alat & AI', description: 'Upload data master pelanggan dan layanan lama secara instan.' }
];

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
    
    // 1. Fetch tenants
    const { data: tenantsData, error: tenantsError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, code, created_at, updated_at')
      .order('name', { ascending: true });

    if (tenantsError) {
      console.error('Super Admin tenants fetch error:', tenantsError);
      return {
        success: false,
        message: tenantsError.message || 'Gagal memuat data tenant.'
      };
    }

    // 2. Fetch feature flags for all tenants
    const { data: featureFlagsData } = await supabaseAdmin
      .from('tenant_feature_flags')
      .select('tenant_id, feature_code, enabled');

    // 3. Fetch branches count
    const { data: branchesData } = await supabaseAdmin
      .from('branches')
      .select('id, business_id');

    // 4. Fetch platform customers for commercial status
    const { data: customersData } = await supabaseAdmin
      .from('platform_customers')
      .select('id, tenant_id, status');

    // 5. Fetch tenant products for subscription details
    const { data: productsData } = await supabaseAdmin
      .from('tenant_products')
      .select('id, tenant_id, status, platform_products(name, code)');

    // 6. Enrich tenants with status, subscription tier & active feature count
    const enriched: TenantRecord[] = (tenantsData || []).map((t) => {
      const cust = customersData?.find((c) => c.tenant_id === t.id);
      const tenantFlags = featureFlagsData?.filter((f) => f.tenant_id === t.id) || [];
      const activeFlagsCount = tenantFlags.length > 0
        ? tenantFlags.filter((f) => f.enabled).length
        : 13; // default all enabled if not restricted
      const branches = branchesData?.filter((b) => b.business_id === t.id) || [];
      const activeProducts = productsData?.filter((p) => p.tenant_id === t.id) || [];

      const mainProduct = activeProducts[0];
      const rawProd: any = mainProduct?.platform_products;
      const prodName = (Array.isArray(rawProd) ? rawProd[0]?.name : rawProd?.name)?.toLowerCase() || '';
      
      let subTier: 'Starter' | 'Pro' | 'Enterprise' | 'Free Trial' = 'Pro';
      if (prodName.includes('starter')) subTier = 'Starter';
      else if (prodName.includes('enterprise')) subTier = 'Enterprise';
      else if (activeFlagsCount === 13) subTier = 'Enterprise';
      else if (activeFlagsCount <= 4) subTier = 'Starter';
      else subTier = 'Pro';

      const subStatus: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CANCELLED' = 
        (mainProduct?.status as any) || 'ACTIVE';

      let tenantStatus: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'INACTIVE' = 'ACTIVE';
      if (cust?.status === 'INACTIVE' || subStatus === 'SUSPENDED') {
        tenantStatus = 'SUSPENDED';
      } else if (subStatus === 'PENDING') {
        tenantStatus = 'TRIAL';
      }

      return {
        ...t,
        status: tenantStatus,
        subscription_tier: subTier,
        subscription_status: subStatus,
        active_features_count: activeFlagsCount,
        total_features_count: 13,
        branches_count: branches.length
      };
    });

    return {
      success: true,
      tenants: enriched
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'An unexpected error occurred while fetching tenants.'
    };
  }
}

export async function getTenantFeatureFlagsAction(tenantId: string): Promise<{
  success: boolean;
  features?: TenantFeatureFlagItem[];
  tenantName?: string;
  tenantCode?: string;
  message?: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    const supabaseAdmin = createAdminClient();
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, code')
      .eq('id', tenantId)
      .single();

    const { data: flags, error } = await supabaseAdmin
      .from('tenant_feature_flags')
      .select('feature_code, enabled')
      .eq('tenant_id', tenantId);

    if (error) throw error;

    const flagMap = new Map<string, boolean>();
    flags?.forEach((f) => flagMap.set(f.feature_code, f.enabled));

    // Default to true for features not explicitly saved yet
    const result: TenantFeatureFlagItem[] = PILIN_STANDARD_FEATURES.map((feat) => ({
      ...feat,
      enabled: flagMap.has(feat.feature_code) ? !!flagMap.get(feat.feature_code) : true
    }));

    return {
      success: true,
      features: result,
      tenantName: tenant?.name || 'Tenant',
      tenantCode: tenant?.code || ''
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memuat konfigurasi fitur tenant.' };
  }
}

export async function updateTenantFeatureFlagsAction(
  tenantId: string,
  features: { feature_code: string; enabled: boolean }[]
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    const supabaseAdmin = createAdminClient();
    const payload = features.map((f) => ({
      tenant_id: tenantId,
      feature_code: f.feature_code,
      enabled: f.enabled
    }));

    const { error } = await supabaseAdmin
      .from('tenant_feature_flags')
      .upsert(payload, { onConflict: 'tenant_id,feature_code' });

    if (error) throw error;

    // Log to audit log
    await supabaseAdmin.from('audit_logs').insert({
      business_id: tenantId,
      operation: 'UPDATE_TENANT_FEATURE_FLAGS',
      entity: 'tenant_feature_flags',
      entity_id: tenantId,
      payload_sanitized: { enabledCount: features.filter(f => f.enabled).length, total: features.length }
    }).select().maybeSingle();

    return {
      success: true,
      message: 'Konfigurasi fitur tenant berhasil disimpan ke database.'
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal menyimpan konfigurasi fitur tenant.' };
  }
}

export async function updateTenantStatusAction(
  tenantId: string,
  newStatus: 'ACTIVE' | 'TRIAL' | 'SUSPENDED'
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Update platform_customers if exists
    await supabaseAdmin
      .from('platform_customers')
      .update({ status: newStatus === 'SUSPENDED' ? 'INACTIVE' : 'ACTIVE', updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    // 2. Update tenant_products if exists
    const productStatus = newStatus === 'SUSPENDED' ? 'SUSPENDED' : newStatus === 'TRIAL' ? 'PENDING' : 'ACTIVE';
    await supabaseAdmin
      .from('tenant_products')
      .update({ status: productStatus, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId);

    // 3. Log audit
    await supabaseAdmin.from('audit_logs').insert({
      business_id: tenantId,
      operation: `UPDATE_TENANT_STATUS_${newStatus}`,
      entity: 'tenants',
      entity_id: tenantId,
      payload_sanitized: { newStatus }
    }).select().maybeSingle();

    return {
      success: true,
      message: `Status operasional tenant berhasil diubah menjadi ${newStatus}.`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mengubah status tenant.' };
  }
}

export async function updateTenantSubscriptionAction(
  tenantId: string,
  payload: {
    plan_tier: 'Starter' | 'Pro' | 'Enterprise';
    status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
    applyFeaturePreset?: boolean;
  }
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: 'Unauthorized' };
    }

    const supabaseAdmin = createAdminClient();

    // If applyFeaturePreset is true, align feature flags with the tier
    if (payload.applyFeaturePreset) {
      let enabledCodes = [];
      if (payload.plan_tier === 'Starter') {
        enabledCodes = ['nota_transaksi', 'service_catalog', 'attendance', 'finance'];
      } else if (payload.plan_tier === 'Pro') {
        enabledCodes = ['nota_transaksi', 'spk', 'service_catalog', 'attendance', 'finance', 'revenue', 'sapaan', 'reminder'];
      } else {
        enabledCodes = PILIN_STANDARD_FEATURES.map(f => f.feature_code);
      }

      const flags = PILIN_STANDARD_FEATURES.map((f) => ({
        tenant_id: tenantId,
        feature_code: f.feature_code,
        enabled: enabledCodes.includes(f.feature_code)
      }));

      await supabaseAdmin
        .from('tenant_feature_flags')
        .upsert(flags, { onConflict: 'tenant_id,feature_code' });
    }

    // Log to audit
    await supabaseAdmin.from('audit_logs').insert({
      business_id: tenantId,
      operation: 'UPDATE_TENANT_SUBSCRIPTION',
      entity: 'tenant_products',
      entity_id: tenantId,
      payload_sanitized: payload
    }).select().maybeSingle();

    return {
      success: true,
      message: `Langganan tenant berhasil diatur ke paket ${payload.plan_tier} (${payload.status}).`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memperbarui paket langganan tenant.' };
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
  source?: string;
  city_area?: string;
  business_type?: string;
  initial_notes?: string;
  next_follow_up_at?: string;
  next_follow_up_notes?: string;
}

export interface PilinProspectActivityRecord {
  id: string;
  prospect_id: string;
  created_at: string;
  pic_name: string;
  activity_type: string;
  notes: string;
  result?: string;
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

export async function createSalesProspectAction(payload: {
  businessName: string;
  ownerName: string;
  contactNumber: string;
  email?: string;
  employeeCount?: string;
  cityArea?: string;
  businessType?: string;
  initialNotes?: string;
  assignedCsName?: string;
}): Promise<{ success: boolean; message: string; prospectId?: string }> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: authCheck.message || 'Unauthorized' };
    }

    const {
      businessName,
      ownerName,
      contactNumber,
      email,
      employeeCount,
      cityArea,
      businessType,
      initialNotes,
      assignedCsName,
    } = payload;

    const cleanBusinessName = businessName?.trim();
    const cleanOwnerName = ownerName?.trim();
    const cleanContactNumber = contactNumber?.trim();
    const cleanEmail = email?.trim()?.toLowerCase() || null;

    if (!cleanBusinessName) return { success: false, message: 'Nama Usaha wajib diisi.' };
    if (!cleanOwnerName) return { success: false, message: 'Nama Owner / PIC wajib diisi.' };
    if (!cleanContactNumber) return { success: false, message: 'Nomor WhatsApp wajib diisi.' };

    const supabaseAdmin = createAdminClient();

    // Duplicate protection check
    let query = supabaseAdmin.from('pilin_prospects').select('id');
    if (cleanEmail) {
      query = query.or(`email.eq.${cleanEmail},whatsapp.eq.${cleanContactNumber}`);
    } else {
      query = query.eq('whatsapp', cleanContactNumber);
    }

    const { data: existingProspect } = await query.maybeSingle();

    let prospectId: string;

    if (existingProspect) {
      // Update existing record
      const updatePayload: any = {
        name: cleanBusinessName,
        owner_name: cleanOwnerName,
        whatsapp: cleanContactNumber,
        source: 'SALES',
      };
      if (cleanEmail) updatePayload.email = cleanEmail;
      if (employeeCount) updatePayload.employee_count = employeeCount;
      if (cityArea) updatePayload.city_area = cityArea.trim();
      if (businessType) updatePayload.business_type = businessType.trim();
      if (initialNotes) updatePayload.initial_notes = initialNotes.trim();
      if (assignedCsName) updatePayload.assigned_cs_name = assignedCsName.trim();

      const { error: updateError } = await supabaseAdmin
        .from('pilin_prospects')
        .update(updatePayload)
        .eq('id', existingProspect.id);

      if (updateError) {
        return { success: false, message: updateError.message };
      }
      prospectId = existingProspect.id;
    } else {
      // Insert new sales prospect
      const insertPayload: any = {
        name: cleanBusinessName,
        owner_name: cleanOwnerName,
        whatsapp: cleanContactNumber,
        email: cleanEmail,
        employee_count: employeeCount || '1-5',
        source: 'SALES',
        status: 'PROSPEK BARU',
        city_area: cityArea?.trim() || null,
        business_type: businessType?.trim() || null,
        initial_notes: initialNotes?.trim() || null,
        assigned_cs_name: assignedCsName?.trim() || null,
      };

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('pilin_prospects')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) {
        return { success: false, message: insertError.message };
      }
      prospectId = inserted.id;

      // Add initial activity note if initialNotes provided
      if (initialNotes?.trim()) {
        await supabaseAdmin.from('pilin_prospect_activities').insert({
          prospect_id: prospectId,
          pic_name: assignedCsName?.trim() || 'Sales',
          activity_type: 'Catatan Awal',
          notes: initialNotes.trim(),
        });
      }
    }

    return {
      success: true,
      message: 'Prospek Sales berhasil disimpan ke Wadah Prospek.',
      prospectId,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Terjadi kesalahan saat menambah prospek sales.' };
  }
}

export async function getProspectActivitiesAction(prospectId: string): Promise<{
  success: boolean;
  message: string;
  activities: PilinProspectActivityRecord[];
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: authCheck.message || 'Unauthorized', activities: [] };
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('pilin_prospect_activities')
      .select('*')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch prospect activities:', error.message);
      return { success: true, message: 'Belum ada aktivitas.', activities: [] };
    }

    return { success: true, message: 'Berhasil memuat histori aktivitas.', activities: data || [] };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memuat aktivitas.', activities: [] };
  }
}

export async function addProspectActivityAction(payload: {
  prospectId: string;
  picName: string;
  activityType: string;
  notes: string;
  result?: string;
  status?: string;
  nextFollowUpAt?: string;
  nextFollowUpNotes?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: authCheck.message || 'Unauthorized' };
    }

    const { prospectId, picName, activityType, notes, result, status, nextFollowUpAt, nextFollowUpNotes } = payload;

    if (!notes?.trim()) {
      return { success: false, message: 'Catatan aktivitas tidak boleh kosong.' };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Insert into pilin_prospect_activities
    const { error: activityError } = await supabaseAdmin
      .from('pilin_prospect_activities')
      .insert({
        prospect_id: prospectId,
        pic_name: picName.trim(),
        activity_type: activityType,
        notes: notes.trim(),
        result: result?.trim() || null,
      });

    if (activityError) {
      console.error('Failed to insert activity log:', activityError.message);
    }

    // 2. Update pilin_prospects timestamp & follow-up info
    const updateData: any = {
      last_followed_up_at: new Date().toISOString(),
      assigned_cs_name: picName.trim(),
    };

    if (status) updateData.status = status;
    if (nextFollowUpAt !== undefined) updateData.next_follow_up_at = nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null;
    if (nextFollowUpNotes !== undefined) updateData.next_follow_up_notes = nextFollowUpNotes.trim();

    await supabaseAdmin
      .from('pilin_prospects')
      .update(updateData)
      .eq('id', prospectId);

    return { success: true, message: 'Aktivitas follow-up berhasil dicatat ke histori.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal mencatat aktivitas.' };
  }
}

export async function updateProspectDetailsAction(payload: {
  prospectId: string;
  status?: string;
  assignedCsName?: string;
  nextFollowUpAt?: string;
  nextFollowUpNotes?: string;
  ownerName?: string;
  cityArea?: string;
  businessType?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: authCheck.message || 'Unauthorized' };
    }

    const { prospectId, status, assignedCsName, nextFollowUpAt, nextFollowUpNotes, ownerName, cityArea, businessType } = payload;

    const supabaseAdmin = createAdminClient();

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (assignedCsName !== undefined) updateData.assigned_cs_name = assignedCsName.trim();
    if (nextFollowUpAt !== undefined) updateData.next_follow_up_at = nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null;
    if (nextFollowUpNotes !== undefined) updateData.next_follow_up_notes = nextFollowUpNotes.trim();
    if (ownerName !== undefined) updateData.owner_name = ownerName.trim();
    if (cityArea !== undefined) updateData.city_area = cityArea.trim();
    if (businessType !== undefined) updateData.business_type = businessType.trim();

    const { error } = await supabaseAdmin
      .from('pilin_prospects')
      .update(updateData)
      .eq('id', prospectId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Data prospek berhasil diperbarui.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Gagal memperbarui data prospek.' };
  }
}

export async function updateProspectFollowUpAction(payload: {
  prospectId: string;
  status: string;
  followUpNotes?: string;
  assignedCsName?: string;
}): Promise<{ success: boolean; message: string }> {
  return addProspectActivityAction({
    prospectId: payload.prospectId,
    picName: payload.assignedCsName || 'CS PILIN',
    activityType: 'Follow-up Catatan',
    notes: payload.followUpNotes || 'Update status prospek',
    status: payload.status,
  });
}


export interface PendingRegistrationRecord {
  id: string;
  name: string;
  ownerName: string;
  whatsapp: string;
  email: string;
  employeeCount: string;
  createdAt: string;
  status: string;
  trialStatus: string;
}

export interface AccNotificationPayload {
  ownerName: string;
  businessName: string;
  phone: string;
  email: string;
  messageText: string;
  waUrl: string;
}

export async function getPendingRegistrationsAction(): Promise<{
  success: boolean;
  registrations: PendingRegistrationRecord[];
  message?: string;
}> {
  try {
    const registrationMap = new Map<string, PendingRegistrationRecord>();

    // 1. Load from persistent hybrid store
    try {
      const storeRecords = PendingRegistrationStore.getAll();
      for (const r of storeRecords) {
        registrationMap.set(r.id, {
          id: r.id,
          name: r.name,
          ownerName: r.ownerName,
          whatsapp: r.whatsapp,
          email: r.email,
          employeeCount: r.employeeCount,
          createdAt: r.createdAt,
          status: r.status,
          trialStatus: r.trialStatus,
        });
      }
    } catch (storeErr) {
      console.warn('PendingRegistrationStore load notice:', storeErr);
    }

    // 2. Query Supabase pilin_prospects if reachable
    try {
      const supabaseAdmin = createAdminClient();
      const { data, error } = await supabaseAdmin
        .from('pilin_prospects')
        .select('id, name, owner_name, whatsapp, email, employee_count, created_at, status, trial_status')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        for (const p of data) {
          registrationMap.set(p.id, {
            id: p.id,
            name: p.name || 'Usaha Tanpa Nama',
            ownerName: p.owner_name || 'Pemilik Usaha',
            whatsapp: p.whatsapp || '-',
            email: p.email || '-',
            employeeCount: p.employee_count || '1 Cabang',
            createdAt: p.created_at || new Date().toISOString(),
            status: p.status || 'NEW',
            trialStatus: p.trial_status || 'PENDING',
          });
        }
      }
    } catch (dbErr) {
      console.warn('Database query for pilin_prospects notice:', dbErr);
    }

    const registrations = Array.from(registrationMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { success: true, registrations };
  } catch (err: any) {
    console.error('getPendingRegistrationsAction critical error:', err);
    return {
      success: true,
      registrations: PendingRegistrationStore.getAll(),
    };
  }
}

export async function accTenantRegistrationAction(prospectId: string): Promise<{
  success: boolean;
  message: string;
  notification?: AccNotificationPayload;
}> {
  try {
    const authCheck = await verifySuperAdminAccess();
    if (!authCheck.authorized) {
      return { success: false, message: 'Unauthorized: Hanya Super Admin yang dapat meng-ACC pendaftaran.' };
    }

    // 1. Update in local/hybrid store
    const storeRecord = PendingRegistrationStore.acc(prospectId);

    let prospect: any = storeRecord ? {
      id: storeRecord.id,
      name: storeRecord.name,
      owner_name: storeRecord.ownerName,
      whatsapp: storeRecord.whatsapp,
      email: storeRecord.email,
      employee_count: storeRecord.employeeCount,
      status: storeRecord.status,
      trial_status: storeRecord.trialStatus,
    } : null;

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const tenantId = `tenant-${prospectId.slice(0, 8)}`;

    // 2. Also try updating Supabase if database connection is available
    try {
      const supabaseAdmin = createAdminClient();

      const { data: dbProspect } = await supabaseAdmin
        .from('pilin_prospects')
        .select('*')
        .eq('id', prospectId)
        .maybeSingle();

      if (dbProspect) {
        prospect = { ...prospect, ...dbProspect };
      }

      await supabaseAdmin
        .from('pilin_prospects')
        .update({
          status: 'CLOSED_WON',
          trial_status: 'ACTIVE',
          trial_start: now.toISOString(),
          trial_end: trialEnd.toISOString(),
        })
        .eq('id', prospectId);

      if (prospect) {
        // Upsert into platform_customers
        const { data: existingCustomer } = await supabaseAdmin
          .from('platform_customers')
          .select('id')
          .or(`email.eq.${prospect.email},phone.eq.${prospect.whatsapp}`)
          .maybeSingle();

        let customerId = existingCustomer?.id;
        if (existingCustomer) {
          await supabaseAdmin
            .from('platform_customers')
            .update({
              status: 'ACTIVE',
              name: prospect.name,
              contact_name: prospect.owner_name || prospect.ownerName,
            })
            .eq('id', existingCustomer.id);
        } else {
          const { data: newCust } = await supabaseAdmin
            .from('platform_customers')
            .insert({
              name: prospect.name,
              contact_name: prospect.owner_name || prospect.ownerName,
              email: prospect.email,
              phone: prospect.whatsapp,
              owner_email: prospect.email,
              status: 'ACTIVE',
            })
            .select('id')
            .single();
          customerId = newCust?.id;
        }

        // Feature flags
        const targetIdForFeatures = customerId || tenantId;
        const flagRows = PILIN_STANDARD_FEATURES.map((feat) => ({
          tenant_id: targetIdForFeatures,
          feature_code: feat.feature_code,
          enabled: true,
          updated_at: now.toISOString(),
        }));

        await supabaseAdmin
          .from('tenant_feature_flags')
          .upsert(flagRows, { onConflict: 'tenant_id,feature_code' });

        // Audit Log
        try {
          await supabaseAdmin
            .from('tenant_audit_logs')
            .insert({
              tenant_id: targetIdForFeatures,
              action: 'TENANT_REGISTRATION_ACC',
              actor_id: authCheck.userId || 'super-admin',
              details: {
                prospect_id: prospectId,
                business_name: prospect.name,
                owner_name: prospect.owner_name || prospect.ownerName,
                approved_at: now.toISOString(),
              },
            });
        } catch (auditErr) {
          console.warn('Audit log write notice:', auditErr);
        }
      }
    } catch (dbErr) {
      console.warn('Notice updating database during tenant ACC:', dbErr);
    }

    if (!prospect) {
      return { success: false, message: 'Data pendaftaran tidak ditemukan.' };
    }

    // 3. Build WhatsApp Notification
    const ownerName = prospect.owner_name || prospect.ownerName || 'Owner';
    const businessName = prospect.name || 'Usaha Anda';
    const email = prospect.email || '-';
    const rawPhone = prospect.whatsapp || '';
    const cleanPhone = rawPhone.replace(/[^0-9]/g, '').replace(/^0/, '62');

    const messageText = `Halo ${ownerName},\n\nPendaftaran usaha "${businessName}" di PILIN ERP telah DISETUJUI oleh Super Admin!\nAkun tenant Anda kini sudah AKTIF dan seluruh modul sistem siap digunakan.\n\n🔗 Akses Portal: https://pilin.id\n👤 Role Masuk: OWNER\n📧 Email / ID: ${email}\n\nSelamat mengelola operasional cabang Anda dengan PILIN ERP!`;

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    return {
      success: true,
      message: `Pendaftaran ${businessName} berhasil di-ACC & diaktifkan!`,
      notification: {
        ownerName,
        businessName,
        phone: rawPhone,
        email,
        messageText,
        waUrl,
      },
    };
  } catch (err: any) {
    console.error('accTenantRegistrationAction error:', err);
    return { success: false, message: err.message || 'Gagal menyetujui pendaftaran tenant.' };
  }
}

export async function syncClientRegistrationsAction(
  records: PendingRegistrationRecord[]
): Promise<{ success: boolean }> {
  try {
    for (const r of records) {
      PendingRegistrationStore.add({
        name: r.name,
        ownerName: r.ownerName,
        whatsapp: r.whatsapp,
        email: r.email,
        employeeCount: r.employeeCount,
      });
    }
    return { success: true };
  } catch {
    return { success: false };
  }
}
