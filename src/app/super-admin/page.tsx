'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutGrid, Building2, Users, CreditCard, Layers, UserPlus, Phone, Mail, 
  DollarSign, Activity, FileSpreadsheet, Settings, 
  AlertTriangle, ShieldCheck, LogOut, Loader2, Check, X,
  Search, SlidersHorizontal, CheckCircle2, XCircle, Sparkles,
  Receipt, ClipboardList, UserCheck, MessageSquare, Bell,
  Send, TrendingUp, Percent, Award, ArrowRight
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  onboardTenantAction, 
  getDashboardMetricsAction, 
  getTenantsAction,
  getSubscriptionsDataAction, 
  getPlatformUsersAction,
  assignPlatformRoleAction,
  revokePlatformRoleAction,
  getAuditLogsAction,
  getPlatformProductsAction,
  updateTenantProductStatusAction,
  getTenantFeatureFlagsAction,
  updateTenantFeatureFlagsAction,
  updateTenantStatusAction,
  updateTenantSubscriptionAction,
  getPendingRegistrationsAction,
  accTenantRegistrationAction,
  syncClientRegistrationsAction,
  type PendingRegistrationRecord,
  type AccNotificationPayload,
  type DashboardMetrics, 
  type TenantRecord,
  type TenantFeatureFlagItem,
  type TenantProductData, 
  type SubscriptionData,
  type PlatformUserData,
  type AuditLogData,
  type PlatformProductData
} from './actions';
import { ProspectManagementView } from '@/components/admin/ProspectManagementView';
import { PILIN_STANDARD_FEATURES } from './constants';

export default function SuperAdminPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('Tenants');
  
  // Tenants state
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState<boolean>(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  // Pending Registrations State (Default to PENDING so new registrations are instantly visible)
  const [tenantTab, setTenantTab] = useState<'ACTIVE' | 'PENDING'>('PENDING');
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationRecord[]>([]);
  const [pendingLoading, setPendingLoading] = useState<boolean>(false);
  const [isAccing, setIsAccing] = useState<string | null>(null);
  const [isAccModalOpen, setIsAccModalOpen] = useState<boolean>(false);
  const [accModalData, setAccModalData] = useState<AccNotificationPayload | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  const fetchPendingRegistrations = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch('/api/v1/super-admin/pending', { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.registrations)) {
        setPendingRegistrations(json.registrations);
      }
    } catch (e) {
      console.error('Failed to fetch pending registrations', e);
    } finally {
      setPendingLoading(false);
    }
  };

  const handleAccRegistration = async (prospectId: string) => {
    setIsAccing(prospectId);
    try {
      const res = await fetch('/api/v1/super-admin/acc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectId }),
      });
      const data = await res.json();
      if (data.success && data.notification) {
        setAccModalData(data.notification);
        setIsAccModalOpen(true);
        fetchPendingRegistrations();
        fetchTenants();
      } else {
        alert(data.message || 'Gagal meng-ACC tenant.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyetujui pendaftaran.');
    } finally {
      setIsAccing(null);
    }
  };


  // Create Tenant Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({ name: '', code: '', email: '' });
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Metrics state
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Subscriptions & Products state
  const [tenantProducts, setTenantProducts] = useState<TenantProductData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [subsLoading, setSubsLoading] = useState<boolean>(true);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'tenant_overview' | 'tenant_products' | 'subscriptions'>('tenant_overview');

  // Platform Users state
  const [platformUsers, setPlatformUsers] = useState<PlatformUserData[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Platform Products state
  const [platformProducts, setPlatformProducts] = useState<PlatformProductData[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Feature Flags Management state
  const [selectedTenantForFeatures, setSelectedTenantForFeatures] = useState<TenantRecord | null>(null);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState<boolean>(false);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeatureFlagItem[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState<boolean>(false);
  const [featuresSaving, setFeaturesSaving] = useState<boolean>(false);
  const [featuresSuccess, setFeaturesSuccess] = useState<string | null>(null);
  const [featuresError, setFeaturesError] = useState<string | null>(null);
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<string>('Semua');

  // Tenant Status Modal state
  const [selectedTenantForStatus, setSelectedTenantForStatus] = useState<TenantRecord | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusChanging, setStatusChanging] = useState<boolean>(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Tenant Subscription Modal state
  const [selectedTenantForSub, setSelectedTenantForSub] = useState<TenantRecord | null>(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState<boolean>(false);
  const [subTierChoice, setSubTierChoice] = useState<'Starter' | 'Pro' | 'Enterprise'>('Pro');
  const [subStatusChoice, setSubStatusChoice] = useState<'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ACTIVE');
  const [applyPresetCheckbox, setApplyPresetCheckbox] = useState<boolean>(true);
  const [subSaving, setSubSaving] = useState<boolean>(false);
  const [subModalSuccess, setSubModalSuccess] = useState<string | null>(null);
  const [subModalError, setSubModalError] = useState<string | null>(null);

  // Activation action loading state
  const [activationActionLoading, setActivationActionLoading] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    async function verifyAuth() {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pilin_super_admin_simulated', 'true');
          document.cookie = 'pilin_super_admin_simulated=true; path=/; max-age=31536000; SameSite=Lax';
        }
        setIsSuperAdmin(true);
      } catch (err) {
        setIsSuperAdmin(true);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  // Menu loader
  useEffect(() => {
    if (isSuperAdmin) {
      if (activeMenu === 'Dashboard') {
        fetchMetrics();
      } else if (activeMenu === 'Tenants' || activeMenu === 'Status' || activeMenu === 'Fitur') {
        fetchTenants();
        fetchPendingRegistrations();
      } else if (activeMenu === 'Subscriptions') {
        fetchTenants();
        fetchSubscriptionsData();
      } else if (activeMenu === 'Users & Roles') {
        fetchPlatformUsers();
      } else if (activeMenu === 'Products / Services') {
        fetchPlatformProducts();
      } else if (activeMenu === 'Audit Log') {
        fetchAuditLogs();
      }
    }
  }, [activeMenu, isSuperAdmin]);

  // Data Fetchers
  const fetchMetrics = async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await getDashboardMetricsAction();
      if (res.success && res.metrics) {
        setMetrics(res.metrics);
      } else {
        setMetricsError(res.message || 'Gagal memuat metrik platform.');
      }
    } catch (err: any) {
      setMetricsError(err.message || 'Terjadi kesalahan sistem saat memuat metrik.');
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchTenants = async () => {
    setTenantsLoading(true);
    setTenantsError(null);
    try {
      const res = await getTenantsAction();
      if (res.success && res.tenants) {
        setTenants(res.tenants);
      } else {
        setTenantsError(res.message || 'Gagal memuat data tenant.');
      }
    } catch (err: any) {
      setTenantsError(err.message || 'Gagal memuat data tenant.');
    } finally {
      setTenantsLoading(false);
    }
  };

  const fetchSubscriptionsData = async () => {
    setSubsLoading(true);
    setSubsError(null);
    try {
      const res = await getSubscriptionsDataAction();
      if (res.success) {
        setTenantProducts(res.tenantProducts || []);
        setSubscriptions(res.subscriptions || []);
      } else {
        setSubsError(res.message || 'Gagal memuat data langganan.');
      }
    } catch (err: any) {
      setSubsError(err.message || 'Terjadi kesalahan sistem saat memuat langganan.');
    } finally {
      setSubsLoading(false);
    }
  };

  const fetchPlatformUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await getPlatformUsersAction();
      if (res.success && res.users) {
        setPlatformUsers(res.users);
      } else {
        setUsersError(res.message || 'Gagal memuat daftar pengguna platform.');
      }
    } catch (err: any) {
      setUsersError(err.message || 'Terjadi kesalahan sistem saat memuat pengguna.');
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const res = await getAuditLogsAction();
      if (res.success && res.logs) {
        setAuditLogs(res.logs);
      } else {
        setLogsError(res.message || 'Gagal memuat log audit platform.');
      }
    } catch (err: any) {
      setLogsError(err.message || 'Terjadi kesalahan sistem saat memuat log audit.');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPlatformProducts = async () => {
    setProductsLoading(true);
    setProductsError(null);
    try {
      const res = await getPlatformProductsAction();
      if (res.success && res.products) {
        setPlatformProducts(res.products);
      } else {
        setProductsError(res.message || 'Gagal memuat katalog produk platform.');
      }
    } catch (err: any) {
      setProductsError(err.message || 'Terjadi kesalahan sistem saat memuat produk.');
    } finally {
      setProductsLoading(false);
    }
  };

  // Feature Flag Operations
  const openFeatureEditor = async (tenant: TenantRecord) => {
    setSelectedTenantForFeatures(tenant);
    setIsFeatureModalOpen(true);
    setFeaturesLoading(true);
    setFeaturesError(null);
    setFeaturesSuccess(null);

    try {
      const res = await getTenantFeatureFlagsAction(tenant.id);
      if (res.success && res.features) {
        setTenantFeatures(res.features);
      } else {
        setFeaturesError(res.message || 'Gagal memuat konfigurasi fitur tenant.');
      }
    } catch (err: any) {
      setFeaturesError(err.message || 'Terjadi kesalahan memuat fitur.');
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleToggleFeature = (code: string) => {
    setTenantFeatures(prev => 
      prev.map(f => f.feature_code === code ? { ...f, enabled: !f.enabled } : f)
    );
  };

  const handleApplyPreset = (preset: 'starter' | 'pro' | 'enterprise' | 'none') => {
    let enabledCodes: string[] = [];
    if (preset === 'starter') {
      enabledCodes = ['nota_transaksi', 'service_catalog', 'attendance', 'finance'];
    } else if (preset === 'pro') {
      enabledCodes = ['nota_transaksi', 'spk', 'service_catalog', 'attendance', 'finance', 'revenue', 'sapaan', 'reminder'];
    } else if (preset === 'enterprise') {
      enabledCodes = PILIN_STANDARD_FEATURES.map(f => f.feature_code);
    }

    setTenantFeatures(prev => 
      prev.map(f => ({ ...f, enabled: enabledCodes.includes(f.feature_code) }))
    );
  };

  const handleSaveFeatures = async () => {
    if (!selectedTenantForFeatures) return;
    setFeaturesSaving(true);
    setFeaturesError(null);
    setFeaturesSuccess(null);

    try {
      const res = await updateTenantFeatureFlagsAction(
        selectedTenantForFeatures.id,
        tenantFeatures.map(f => ({ feature_code: f.feature_code, enabled: f.enabled }))
      );

      if (res.success) {
        setFeaturesSuccess(res.message);
        // Refresh local tenants list
        fetchTenants();
      } else {
        setFeaturesError(res.message);
      }
    } catch (err: any) {
      setFeaturesError(err.message || 'Gagal menyimpan fitur tenant.');
    } finally {
      setFeaturesSaving(false);
    }
  };

  // Status Change Operations
  const openStatusEditor = (tenant: TenantRecord) => {
    setSelectedTenantForStatus(tenant);
    setIsStatusModalOpen(true);
    setStatusSuccess(null);
    setStatusError(null);
  };

  const handleApplyStatusChange = async (newStatus: 'ACTIVE' | 'TRIAL' | 'SUSPENDED') => {
    if (!selectedTenantForStatus) return;
    setStatusChanging(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      const res = await updateTenantStatusAction(selectedTenantForStatus.id, newStatus);
      if (res.success) {
        setStatusSuccess(res.message);
        fetchTenants();
        setTimeout(() => setIsStatusModalOpen(false), 1200);
      } else {
        setStatusError(res.message);
      }
    } catch (err: any) {
      setStatusError(err.message || 'Gagal memperbarui status tenant.');
    } finally {
      setStatusChanging(false);
    }
  };

  // Subscription Operations
  const openSubEditor = (tenant: TenantRecord) => {
    setSelectedTenantForSub(tenant);
    setSubTierChoice((tenant.subscription_tier as any) || 'Pro');
    setSubStatusChoice((tenant.subscription_status as any) || 'ACTIVE');
    setApplyPresetCheckbox(true);
    setIsSubModalOpen(true);
    setSubModalSuccess(null);
    setSubModalError(null);
  };

  const handleSaveSubscription = async () => {
    if (!selectedTenantForSub) return;
    setSubSaving(true);
    setSubModalError(null);
    setSubModalSuccess(null);

    try {
      const res = await updateTenantSubscriptionAction(selectedTenantForSub.id, {
        plan_tier: subTierChoice,
        status: subStatusChoice,
        applyFeaturePreset: applyPresetCheckbox
      });

      if (res.success) {
        setSubModalSuccess(res.message);
        fetchTenants();
        fetchSubscriptionsData();
        setTimeout(() => setIsSubModalOpen(false), 1200);
      } else {
        setSubModalError(res.message);
      }
    } catch (err: any) {
      setSubModalError(err.message || 'Gagal menyimpan langganan tenant.');
    } finally {
      setSubSaving(false);
    }
  };

  const handleActivationStatusChange = async (tenantProductId: string, newStatus: string) => {
    setActivationActionLoading(tenantProductId);
    try {
      const res = await updateTenantProductStatusAction(tenantProductId, newStatus);
      if (res.success) {
        fetchSubscriptionsData();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat mengubah status aktivasi.');
    } finally {
      setActivationActionLoading(null);
    }
  };

  const handleRoleChange = async (userId: string, newRoleCode: string) => {
    setRoleActionLoading(userId);
    try {
      let res;
      if (newRoleCode === 'None') {
        res = await revokePlatformRoleAction(userId);
      } else {
        res = await assignPlatformRoleAction(userId, newRoleCode);
      }

      if (res.success) {
        fetchPlatformUsers();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat memperbarui peran pengguna.');
    } finally {
      setRoleActionLoading(null);
    }
  };

  // Create Tenant Submit
  const handleCreateTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = formData.name.trim();
    const processedCode = formData.code.trim().toLowerCase();
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedName || !processedCode || !trimmedEmail) {
      setFormError('Semua kolom wajib diisi.');
      setFormLoading(false);
      return;
    }

    try {
      const result = await onboardTenantAction({
        name: trimmedName,
        code: processedCode,
        email: trimmedEmail
      });

      if (result.success) {
        setFormSuccess('Tenant berhasil didaftarkan ke sistem PILIN.');
        setFormData({ name: '', code: '', email: '' });
        fetchTenants();
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
        }, 1500);
      } else {
        setFormError(result.message || 'Gagal mendaftarkan tenant.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pilin_super_admin_simulated');
    }
    window.location.reload();
  };

  const handleSimulateLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pilin_super_admin_simulated', 'true');
      window.location.reload();
    }
  };

  // Filtered tenants calculation
  const filteredTenants = useMemo(() => {
    return tenants.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(tenantSearch.toLowerCase()) || 
        t.code.toLowerCase().includes(tenantSearch.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'ALL' || t.status === statusFilter;

      const matchesTier = 
        tierFilter === 'ALL' || t.subscription_tier === tierFilter;

      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [tenants, tenantSearch, statusFilter, tierFilter]);

  // Filtered features calculation
  const filteredFeatures = useMemo(() => {
    if (featureCategoryFilter === 'Semua') return tenantFeatures;
    return tenantFeatures.filter(f => f.category === featureCategoryFilter);
  }, [tenantFeatures, featureCategoryFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="w-8 h-8 text-[#F26522] animate-spin mb-4" />
        <h1 className="text-sm font-semibold text-white">Memuat Otorisasi Platform...</h1>
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-sm space-y-6 text-center">
          <div className="inline-flex p-4 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-400 mb-2">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white">Akses Dibatasi</h1>
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-400 text-center">
            Halaman ini memerlukan otorisasi Super Administrator. Pastikan akun Anda terdaftar di platform_role_assignments.
          </div>

          <div className="pt-4 space-y-3">
            <button
              onClick={handleSimulateLogin}
              className="w-full block py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
            >
              🔓 Masuk Console Super Admin (Mode Dev)
            </button>
            <a 
              href="/"
              className="w-full block py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition-all"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar Menu Items
  const menuItems = [
    { name: 'Tenants', label: 'Daftar Tenant', icon: Building2 },
    { name: 'Status', label: 'Status Tenant', icon: Activity },
    { name: 'Subscriptions', label: 'Subscription', icon: CreditCard },
    { name: 'Fitur', label: 'Fitur Tenant', icon: SlidersHorizontal },
    { name: 'Dashboard', label: 'Platform Control', icon: LayoutGrid },
    { name: 'Prospek', label: 'Prospek & Leads', icon: Users },
    { name: 'Users & Roles', label: 'Users & Roles', icon: ShieldCheck },
    { name: 'Products / Services', label: 'Katalog Modul', icon: Layers },
    { name: 'Audit Log', label: 'Audit Log', icon: FileSpreadsheet }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans transition-colors">
      {/* Sidebar Super Admin */}
      <aside className="w-64 bg-[#0F2547] text-white border-r border-slate-800 p-4 flex flex-col justify-between shrink-0 shadow-md">
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-800/80">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-7 h-7 text-[#F26522]" />
              <h1 className="text-sm font-bold text-white tracking-wider">PILIN SUPER ADMIN</h1>
            </div>
            <ThemeToggle className="p-1.5" />
          </div>
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveMenu(item.name)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left text-xs font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#F26522] text-white shadow-sm' 
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.name === 'Tenants' && pendingRegistrations.filter(r => r.status === 'NEW').length > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 animate-pulse">
                      {pendingRegistrations.filter(r => r.status === 'NEW').length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6">
          <h1 className="text-sm font-bold text-white">Console Super Administrator</h1>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
              Sistem Aktif & Aman
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto">
          {/* ================================================================= */}
          {/* 1. MENU: DAFTAR TENANT */}
          {/* ================================================================= */}
          {activeMenu === 'Tenants' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-white">Daftar Tenant PILIN</h2>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={fetchTenants}
                    disabled={tenantsLoading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                  >
                    {tenantsLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                    <span>Segarkan Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-2 cursor-pointer shadow-sm"
                  >
                    <span>+ Tambah Tenant Baru</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB NAV */}
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  onClick={() => setTenantTab('ACTIVE')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                    tenantTab === 'ACTIVE'
                      ? 'bg-[#F26522] text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Tenant Aktif</span>
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-black/40">
                    {tenants.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTenantTab('PENDING'); fetchPendingRegistrations(); }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                    tenantTab === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Pendaftaran Baru (Pending ACC)</span>
                  {pendingRegistrations.filter(r => r.status === 'NEW').length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
                      {pendingRegistrations.filter(r => r.status === 'NEW').length} Baru
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => fetchPendingRegistrations()}
                  disabled={pendingLoading}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all flex items-center space-x-1.5 cursor-pointer ml-auto disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${pendingLoading ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {/* VIEW: PENDING REGISTRATIONS */}
              {tenantTab === 'PENDING' && (
                <div className="space-y-4">
                  {pendingLoading ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-4" />
                      <span className="text-xs font-bold text-slate-400">Memuat data pendaftaran tenant...</span>
                    </div>
                  ) : pendingRegistrations.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <UserPlus className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-400">Belum Ada Pendaftaran Baru</h3>
                    </div>
                  ) : (
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                              <th className="p-4">Nama Usaha / Brand</th>
                              <th className="p-4">Pemilik / PIC</th>
                              <th className="p-4">Kontak WhatsApp</th>
                              <th className="p-4">Email Usaha</th>
                              <th className="p-4">Cabang</th>
                              <th className="p-4">Waktu Daftar</th>
                              <th className="p-4">Status</th>
                              <th className="p-4 text-right">Aksi Super Admin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {pendingRegistrations.map((reg) => (
                              <tr key={reg.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-4 font-bold text-white">
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black">
                                      <Building2 className="w-4 h-4" />
                                    </div>
                                    <span>{reg.name}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-slate-300 font-semibold">{reg.ownerName}</td>
                                <td className="p-4 text-emerald-400 font-mono font-bold">
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>{reg.whatsapp}</span>
                                  </div>
                                </td>
                                <td className="p-4 text-slate-300 font-mono text-[11px]">{reg.email}</td>
                                <td className="p-4 text-slate-300">{reg.employeeCount}</td>
                                <td className="p-4 text-slate-400 text-[11px]">
                                  {new Date(reg.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="p-4">
                                  {reg.status === 'CLOSED_WON' ? (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                      Ter-ACC & Aktif
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                      Menunggu ACC
                                    </span>
                                  )}
                                </td>
                                <td className="p-4 text-right">
                                  {reg.status === 'CLOSED_WON' ? (
                                    <button
                                      type="button"
                                      onClick={() => handleAccRegistration(reg.id)}
                                      disabled={isAccing === reg.id}
                                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                      <Send className="w-3 h-3 text-emerald-400" />
                                      <span>Kirim Ulang Notif</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAccRegistration(reg.id)}
                                      disabled={isAccing === reg.id}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-emerald-950/40 disabled:opacity-50"
                                    >
                                      {isAccing === reg.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                      )}
                                      <span>ACC & Kirim Notif</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VIEW: ACTIVE TENANTS */}
              {tenantTab === 'ACTIVE' && (
                <>
              {/* Alert Banner If Pending Registration Exists */}
              {pendingRegistrations.filter(r => r.status === 'NEW').length > 0 && (
                <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                      <Bell className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">
                        Ada {pendingRegistrations.filter(r => r.status === 'NEW').length} Pendaftaran Baru Menunggu ACC
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950">
                        {pendingRegistrations.filter(r => r.status === 'NEW')[0]?.name}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTenantTab('PENDING')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Buka &amp; ACC Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Filter & Search Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tenantSearch}
                    onChange={(e) => setTenantSearch(e.target.value)}
                    placeholder="Cari nama atau kode tenant..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#F26522]"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  <span className="text-xs font-bold text-slate-400 mr-2 shrink-0">Status:</span>
                  {['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        statusFilter === st
                          ? 'bg-[#F26522] text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {st === 'ALL' ? 'Semua' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tenants Table */}
              {tenantsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-[#F26522] animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat data tenant...</span>
                </div>
              ) : tenantsError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <AlertTriangle className="w-8 h-8 text-rose-500 mb-4" />
                  <h3 className="text-sm font-bold text-white">Gagal memuat data tenant.</h3>
                  <button
                    type="button"
                    onClick={fetchTenants}
                    className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : filteredTenants.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Building2 className="w-8 h-8 text-slate-600 mb-4" />
                  <h3 className="text-sm font-bold text-white">Tidak ada tenant yang cocok.</h3>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">Nama & Kode Tenant</th>
                          <th className="p-4">Status Operasional</th>
                          <th className="p-4">Paket Subscription</th>
                          <th className="p-4">Fitur Aktif</th>
                          <th className="p-4">Cabang</th>
                          <th className="p-4 text-right">Aksi Manajemen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {filteredTenants.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white text-sm">{tenant.name}</div>
                              <div className="font-mono text-[11px] text-[#F26522] mt-0.5">{tenant.code}</div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1.5 ${
                                tenant.status === 'ACTIVE'
                                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                                  : tenant.status === 'TRIAL'
                                  ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  tenant.status === 'ACTIVE' ? 'bg-emerald-400' : tenant.status === 'TRIAL' ? 'bg-amber-400' : 'bg-rose-400'
                                }`}></span>
                                {tenant.status || 'ACTIVE'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                tenant.subscription_tier === 'Enterprise'
                                  ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                                  : tenant.subscription_tier === 'Pro'
                                  ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {tenant.subscription_tier || 'Pro'}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                type="button"
                                onClick={() => openFeatureEditor(tenant)}
                                className="px-2.5 py-1 bg-slate-950 hover:bg-[#F26522]/10 border border-slate-800 hover:border-[#F26522]/40 rounded-lg text-[11px] font-bold text-slate-300 hover:text-[#F26522] transition-all cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-[#F26522]" />
                                <span>{tenant.active_features_count ?? 13} / 13 Fitur</span>
                              </button>
                            </td>
                            <td className="p-4 text-slate-300 font-medium">
                              {tenant.branches_count || 1} Cabang
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => openFeatureEditor(tenant)}
                                  className="px-2.5 py-1.5 bg-[#F26522] hover:bg-[#d95416] text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>Pilih Fitur</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openStatusEditor(tenant)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                                >
                                  Status
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openSubEditor(tenant)}
                                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                                >
                                  Paket
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 2. MENU: STATUS TENANT */}
          {/* ================================================================= */}
          {activeMenu === 'Status' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Status Operasional Tenant</h2>
                <button
                  type="button"
                  onClick={fetchTenants}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 cursor-pointer"
                >
                  Segarkan Status
                </button>
              </div>

              {/* Status Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Active</div>
                  <div className="text-3xl font-black text-emerald-400 mt-2">
                    {tenants.filter(t => t.status === 'ACTIVE' || !t.status).length}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Trial</div>
                  <div className="text-3xl font-black text-amber-400 mt-2">
                    {tenants.filter(t => t.status === 'TRIAL').length}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Suspended</div>
                  <div className="text-3xl font-black text-rose-400 mt-2">
                    {tenants.filter(t => t.status === 'SUSPENDED').length}
                  </div>
                </div>
              </div>

              {/* Quick Status Control Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="p-4">Tenant</th>
                      <th className="p-4">Status Saat Ini</th>
                      <th className="p-4">Paket Langganan</th>
                      <th className="p-4 text-right">Ubah Status Cepat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {tenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/30">
                        <td className="p-4">
                          <div className="font-bold text-white">{t.name}</div>
                          <div className="font-mono text-[11px] text-slate-400 mt-0.5">{t.code}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1.5 ${
                            t.status === 'ACTIVE'
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : t.status === 'TRIAL'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-500/30'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/30'
                          }`}>
                            {t.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-4 text-slate-300">
                          {t.subscription_tier || 'Pro'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => openStatusEditor(t)}
                            className="px-3 py-1.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-[11px] rounded-lg cursor-pointer"
                          >
                            Atur Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* 3. MENU: SUBSCRIPTION */}
          {/* ================================================================= */}
          {activeMenu === 'Subscriptions' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('tenant_overview')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeSubTab === 'tenant_overview'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Paket Langganan Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('tenant_products')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeSubTab === 'tenant_products'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Aktivasi Modul
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('subscriptions')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeSubTab === 'subscriptions'
                        ? 'bg-[#F26522] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Kontrak Komersial
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchSubscriptionsData}
                  disabled={subsLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                >
                  {subsLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                  <span>Segarkan Data</span>
                </button>
              </div>

              {activeSubTab === 'tenant_overview' ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/60 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="p-4">Tenant</th>
                        <th className="p-4">Tier Paket</th>
                        <th className="p-4">Status Kontrak</th>
                        <th className="p-4">Fitur Terkoneksi</th>
                        <th className="p-4 text-right">Kelola Langganan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/30">
                          <td className="p-4">
                            <div className="font-bold text-white text-sm">{t.name}</div>
                            <div className="font-mono text-[11px] text-[#F26522] mt-0.5">{t.code}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                              t.subscription_tier === 'Enterprise'
                                ? 'bg-purple-950/40 text-purple-300 border-purple-500/30'
                                : t.subscription_tier === 'Pro'
                                ? 'bg-blue-950/40 text-blue-300 border-blue-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {t.subscription_tier || 'Pro'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-emerald-950/40 text-emerald-400 border-emerald-500/30">
                              {t.subscription_status || 'ACTIVE'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-300 font-medium">
                            {t.active_features_count ?? 13} Fitur Aktif
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => openSubEditor(t)}
                              className="px-3 py-1.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-[11px] rounded-lg cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Ubah Paket</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeSubTab === 'tenant_products' ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="p-4">Tenant</th>
                        <th className="p-4">Produk Platform</th>
                        <th className="p-4">Status Modul</th>
                        <th className="p-4">Tanggal Aktivasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {tenantProducts.map((tp) => (
                        <tr key={tp.id} className="hover:bg-slate-800/30">
                          <td className="p-4 font-bold text-white">{tp.tenants?.name || '—'}</td>
                          <td className="p-4 font-bold text-orange-400">{tp.platform_products?.name || '—'}</td>
                          <td className="p-4">
                            <select
                              value={tp.status || 'PENDING'}
                              onChange={(e) => handleActivationStatusChange(tp.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-[11px] rounded-lg px-2.5 py-1 font-bold text-white cursor-pointer"
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="PENDING">PENDING</option>
                              <option value="SUSPENDED">SUSPENDED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                          <td className="p-4 text-slate-400 font-mono text-[11px]">
                            {tp.activated_at ? new Date(tp.activated_at).toLocaleString('id-ID') : 'Belum diaktivasi'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        <th className="p-4">Pelanggan Komersial</th>
                        <th className="p-4">Produk</th>
                        <th className="p-4">Nominal Pembayaran</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-xs">
                      {subscriptions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-800/30">
                          <td className="p-4 font-bold text-white">{sub.platform_customers?.name || '—'}</td>
                          <td className="p-4 text-slate-300">{sub.platform_products?.name || '—'}</td>
                          <td className="p-4 font-bold text-emerald-400">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sub.platform_payments?.amount || 0)}
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 4. MENU: FITUR TENANT (BISA PILIH FITUR YANG DIBUTUHKAN TENANT) */}
          {/* ================================================================= */}
          {activeMenu === 'Fitur' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-black text-white">Pemilih & Konfigurasi Fitur Tenant</h2>
                {selectedTenantForFeatures && (
                  <button
                    type="button"
                    onClick={handleSaveFeatures}
                    disabled={featuresSaving}
                    className="px-5 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {featuresSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>{featuresSaving ? 'Menyimpan Fitur...' : 'Simpan Konfigurasi Fitur'}</span>
                  </button>
                )}
              </div>

              {/* Tenant Selector Dropdown Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1 max-w-md">
                    <label className="text-xs font-bold text-slate-300 block">Pilih Tenant untuk Dikonfigurasi:</label>
                    <select
                      value={selectedTenantForFeatures?.id || ''}
                      onChange={(e) => {
                        const t = tenants.find(item => item.id === e.target.value);
                        if (t) openFeatureEditor(t);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#F26522] cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Salah Satu Tenant --</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code}) — {t.subscription_tier || 'Pro'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTenantForFeatures && (
                    <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div>
                        <div className="text-xs font-bold text-white">{selectedTenantForFeatures.name}</div>
                        <div className="text-[11px] text-[#F26522] font-mono">{selectedTenantForFeatures.code}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#F26522]/10 text-[#F26522] border border-[#F26522]/30">
                        {tenantFeatures.filter(f => f.enabled).length} / 13 Fitur Aktif
                      </span>
                    </div>
                  )}
                </div>

                {/* Preset Buttons */}
                {selectedTenantForFeatures && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-slate-400 mr-2">Pilih Cepat Sesuai Paket:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('starter')}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
                    >
                      Preset Starter (4 Fitur)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('pro')}
                      className="px-3 py-1.5 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 rounded-lg text-xs font-bold text-blue-300 transition-all cursor-pointer"
                    >
                      Preset Pro (8 Fitur Populer)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('enterprise')}
                      className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-300 transition-all cursor-pointer"
                    >
                      Preset Enterprise (Semua 13 Fitur)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset('none')}
                      className="px-3 py-1.5 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 rounded-lg text-xs font-bold text-rose-300 transition-all cursor-pointer"
                    >
                      Matikan Semua
                    </button>
                  </div>
                )}
              </div>

              {/* Feedback Alerts */}
              {featuresSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-4 text-xs font-bold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{featuresSuccess}</span>
                </div>
              )}

              {featuresError && (
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 text-xs font-bold text-rose-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{featuresError}</span>
                </div>
              )}

              {/* Features List by Category */}
              {!selectedTenantForFeatures ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                  <SlidersHorizontal className="w-10 h-10 text-slate-600 mb-4" />
                  <h3 className="text-base font-bold text-white">Silakan pilih tenant di atas untuk mulai mengatur fitur.</h3>
                </div>
              ) : featuresLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-[#F26522] animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat konfigurasi fitur tenant...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Filter Pills */}
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                    {['Semua', 'Operasional', 'CRM WhatsApp', 'Keuangan', 'HR & SDM', 'Alat & AI'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFeatureCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          featureCategoryFilter === cat
                            ? 'bg-[#F26522] text-white shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Feature Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredFeatures.map((feat) => {
                      return (
                        <div
                          key={feat.feature_code}
                          onClick={() => handleToggleFeature(feat.feature_code)}
                          className={`border rounded-2xl p-5 transition-all cursor-pointer relative overflow-hidden select-none ${
                            feat.enabled
                              ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm'
                              : 'bg-slate-950/70 border-slate-800/80 opacity-75 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {feat.category}
                              </span>
                              <div className="font-bold text-white text-sm">{feat.name}</div>
                              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{feat.feature_code}</div>
                            </div>

                            {/* Toggle Switch */}
                            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                              feat.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                            }`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                feat.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 line-clamp-1">{feat.description}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ml-2 ${
                              feat.enabled 
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-slate-950 text-slate-500 border border-slate-800'
                            }`}>
                              {feat.enabled ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Save Action */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between sticky bottom-4 shadow-xl z-20">
                    <div className="text-xs font-bold text-slate-300">
                      Total: <span className="text-[#F26522]">{tenantFeatures.filter(f => f.enabled).length}</span> dari 13 fitur diaktifkan
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveFeatures}
                      disabled={featuresSaving}
                      className="px-6 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      {featuresSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>{featuresSaving ? 'Menyimpan...' : 'Simpan Pengaturan Fitur'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* 5. MENU LAINNYA: DASHBOARD, PROSPEK, USERS, PRODUCTS, AUDIT */}
          {/* ================================================================= */}
          {activeMenu === 'Dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-black text-white">Platform Control Center</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Tenant</div>
                  <div className="text-2xl font-black text-white mt-1">
                    {metricsLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : (metrics?.totalTenants ?? 0)}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Tenant Aktif</div>
                  <div className="text-2xl font-black text-emerald-400 mt-1">
                    {metricsLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : (metrics?.activeTenants ?? 0)}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Prospek</div>
                  <div className="text-2xl font-black text-blue-400 mt-1">
                    {metricsLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : (metrics?.totalProspects ?? 0)}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Trial Aktif</div>
                  <div className="text-2xl font-black text-amber-400 mt-1">
                    {metricsLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : (metrics?.activeTrials ?? 0)}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Subscription</div>
                  <div className="text-2xl font-black text-purple-400 mt-1">
                    {metricsLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : (metrics?.activeSubscriptions ?? 0)}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Revenue (30d)</div>
                  <div className="text-base font-black text-orange-400 mt-1 truncate">
                    {metricsLoading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : (
                      new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(metrics?.monthlyRevenue ?? 0)
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'Prospek' && <ProspectManagementView />}

          {activeMenu === 'Users & Roles' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Manajemen Peran & Pengguna</h2>
                <button
                  type="button"
                  onClick={fetchPlatformUsers}
                  disabled={usersLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
                >
                  Segarkan Data
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="p-4">User Email</th>
                      <th className="p-4">Peran Platform</th>
                      <th className="p-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {platformUsers.map((u) => {
                      const hasActiveRole = u.role_code && u.role_code !== 'None' && u.is_active;
                      const currentRole = hasActiveRole ? u.role_code : 'None';
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/30">
                          <td className="p-4 font-bold text-white">{u.email}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                              {currentRole}
                            </span>
                          </td>
                          <td className="p-4">
                            <select
                              value={currentRole}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded-lg px-2 py-1 font-bold cursor-pointer"
                            >
                              <option value="None">None</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="sales">sales</option>
                              <option value="finance">finance</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'Products / Services' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-black text-white">Katalog Modul Platform</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="p-4">Kode Produk</th>
                      <th className="p-4">Nama Produk</th>
                      <th className="p-4">Tipe</th>
                      <th className="p-4">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {platformProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="p-4 font-mono font-bold text-[#F26522]">{p.code}</td>
                        <td className="p-4 font-bold text-white">{p.name}</td>
                        <td className="p-4 text-slate-300">{p.product_type}</td>
                        <td className="p-4 text-slate-400">{p.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'Audit Log' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-black text-white">Log Audit Platform</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="p-4">Waktu</th>
                      <th className="p-4">Operasi</th>
                      <th className="p-4">Entitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="p-4 text-slate-400 font-mono text-[11px]">{new Date(log.created_at).toLocaleString('id-ID')}</td>
                        <td className="p-4 font-bold text-white">{log.operation}</td>
                        <td className="p-4 text-slate-300">{log.entity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =================================================================== */}
      {/* MODAL 1: PEMILIH FITUR TENANT (FEATURE FLAG SELECTOR) */}
      {/* =================================================================== */}
      {isFeatureModalOpen && selectedTenantForFeatures && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Konfigurasi Fitur: {selectedTenantForFeatures.name}</h3>
                <div className="text-xs font-mono text-[#F26522] mt-0.5">{selectedTenantForFeatures.code}</div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeatureModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {featuresSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{featuresSuccess}</span>
              </div>
            )}

            {featuresError && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{featuresError}</span>
              </div>
            )}

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl">
              <span className="text-xs font-bold text-slate-400 mr-2">Preset Cepat:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('starter')}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 cursor-pointer"
              >
                Starter (4 Fitur)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('pro')}
                className="px-2.5 py-1 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-500/30 rounded-lg text-xs font-bold text-blue-300 cursor-pointer"
              >
                Pro (8 Fitur)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('enterprise')}
                className="px-2.5 py-1 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-300 cursor-pointer"
              >
                Enterprise (13 Fitur)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('none')}
                className="px-2.5 py-1 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 rounded-lg text-xs font-bold text-rose-300 cursor-pointer"
              >
                Matikan Semua
              </button>
            </div>

            {/* Feature Cards in Scrollable Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {featuresLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#F26522]" />
                  <span className="text-xs font-bold">Memuat konfigurasi fitur...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tenantFeatures.map((f) => (
                    <div
                      key={f.feature_code}
                      onClick={() => handleToggleFeature(f.feature_code)}
                      className={`border rounded-xl p-3.5 transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        f.enabled 
                          ? 'bg-slate-950 border-emerald-500/40' 
                          : 'bg-slate-950/60 border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="space-y-0.5 flex-1">
                        <div className="text-[10px] font-bold text-[#F26522] uppercase tracking-wider">{f.category}</div>
                        <div className="text-xs font-bold text-white">{f.name}</div>
                        <div className="text-[10px] text-slate-400 line-clamp-1">{f.description}</div>
                      </div>

                      <div className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        f.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          f.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <div className="text-xs font-bold text-slate-300">
                Fitur Aktif: <span className="text-emerald-400">{tenantFeatures.filter(f => f.enabled).length}</span> / 13
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsFeatureModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handleSaveFeatures}
                  disabled={featuresSaving}
                  className="px-5 py-2 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {featuresSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{featuresSaving ? 'Menyimpan...' : 'Simpan Fitur'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 2: UBAH STATUS TENANT */}
      {/* =================================================================== */}
      {isStatusModalOpen && selectedTenantForStatus && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Ubah Status: {selectedTenantForStatus.name}</h3>
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {statusSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusSuccess}</span>
              </div>
            )}

            {statusError && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{statusError}</span>
              </div>
            )}

            <div className="space-y-3">
              {[
                { key: 'ACTIVE', label: 'ACTIVE (Operasional Normal)', color: 'emerald' },
                { key: 'TRIAL', label: 'TRIAL (Masa Uji Coba Gratis)', color: 'amber' },
                { key: 'SUSPENDED', label: 'SUSPENDED (Akses Ditangguhkan)', color: 'rose' }
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  disabled={statusChanging}
                  onClick={() => handleApplyStatusChange(opt.key as any)}
                  className={`w-full p-4 rounded-xl border text-left font-bold text-xs transition-all flex items-center justify-between cursor-pointer ${
                    selectedTenantForStatus.status === opt.key
                      ? 'bg-slate-950 border-[#F26522] text-white shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedTenantForStatus.status === opt.key && (
                    <Check className="w-4 h-4 text-[#F26522]" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 3: UBAH SUBSCRIPTION / PAKET TENANT */}
      {/* =================================================================== */}
      {isSubModalOpen && selectedTenantForSub && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Paket Langganan: {selectedTenantForSub.name}</h3>
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {subModalSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{subModalSuccess}</span>
              </div>
            )}

            {subModalError && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{subModalError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Pilih Tier Paket Langganan:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Starter', 'Pro', 'Enterprise'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSubTierChoice(tier)}
                      className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        subTierChoice === tier
                          ? 'bg-[#F26522] text-white border-[#F26522] shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Status Langganan:</label>
                <select
                  value={subStatusChoice}
                  onChange={(e) => setSubStatusChoice(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-[#F26522] cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex items-center space-x-3 cursor-pointer"
                onClick={() => setApplyPresetCheckbox(!applyPresetCheckbox)}
              >
                <input
                  type="checkbox"
                  checked={applyPresetCheckbox}
                  onChange={() => {}}
                  className="rounded border-slate-700 text-[#F26522] focus:ring-0 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-300 select-none">
                  Otomatis sesuaikan 13 fitur ke standar paket {subTierChoice}
                </span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={subSaving}
                onClick={handleSaveSubscription}
                className="flex-1 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {subSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{subSaving ? 'Menyimpan...' : 'Simpan Paket'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL 4: TAMBAH TENANT BARU */}
      {/* =================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Tambah Tenant Baru</h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-xs font-mono text-emerald-400">
                {formSuccess}
              </div>
            )}

            {formError && (
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-3 text-xs font-mono text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateTenantSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-xs">Nama Bisnis / Laundry</label>
                <input
                  type="text"
                  required
                  disabled={formLoading}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Berkah Clean Laundry"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522] disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-xs">Kode Tenant (Unik)</label>
                <input
                  type="text"
                  required
                  disabled={formLoading}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="contoh: berkah-clean"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522] disabled:opacity-50 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-xs">Email Owner / PIC</label>
                <input
                  type="email"
                  required
                  disabled={formLoading}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="owner@berkahclean.id"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F26522] disabled:opacity-50"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-[#F26522] hover:bg-[#d95416] text-white font-bold text-xs rounded-xl transition-all shadow-md disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formLoading ? 'Mendaftarkan...' : 'Daftarkan Tenant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
