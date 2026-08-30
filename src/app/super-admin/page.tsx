'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, Building2, Users, CreditCard, Layers, 
  DollarSign, Activity, FileSpreadsheet, Settings, 
  AlertTriangle, ShieldCheck, LogOut, Loader2 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { 
  onboardTenantAction, 
  getDashboardMetricsAction, 
  getSubscriptionsDataAction, 
  getPlatformUsersAction,
  assignPlatformRoleAction,
  revokePlatformRoleAction,
  getAuditLogsAction,
  getPlatformProductsAction,
  updateTenantProductStatusAction,
  type DashboardMetrics, 
  type TenantProductData, 
  type SubscriptionData,
  type PlatformUserData,
  type AuditLogData,
  type PlatformProductData
} from './actions';





export default function SuperAdminPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeMenu, setActiveMenu] = useState<string>('Dashboard');
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState<boolean>(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({ name: '', code: '', email: '' });
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    // Return early if developer mode simulation is running (can render mock metrics or attempt real queries)
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await getDashboardMetricsAction();
      if (res.success && res.metrics) {
        setMetrics(res.metrics);
      } else {
        setMetricsError(res.message || 'Gagal memuat metrik dasbor.');
      }
    } catch (err: any) {
      setMetricsError(err.message || 'Terjadi kesalahan sistem saat memuat metrik.');
    } finally {
      setMetricsLoading(false);
    }
  };

  const [tenantProducts, setTenantProducts] = useState<TenantProductData[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);
  const [subsLoading, setSubsLoading] = useState<boolean>(true);
  const [subsError, setSubsError] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'tenant_products' | 'subscriptions'>('tenant_products');

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

  const [platformUsers, setPlatformUsers] = useState<PlatformUserData[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [roleActionLoading, setRoleActionLoading] = useState<string | null>(null);

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
      alert(err.message || 'Terjadi kesalahan saat membarui peran pengguna.');
    } finally {
      setRoleActionLoading(null);
    }
  };

  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

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

  const [platformProducts, setPlatformProducts] = useState<PlatformProductData[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string | null>(null);

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

  const [activationActionLoading, setActivationActionLoading] = useState<string | null>(null);

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

  const fetchTenants = async () => {
    setTenantsLoading(true);
    setTenantsError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, code, created_at, updated_at')
        .order('name', { ascending: true });

      if (error) {
        setTenantsError(error.message);
      } else {
        setTenants(data || []);
      }
    } catch (err: any) {
      setTenantsError(err.message || 'Gagal memuat data tenant.');
    } finally {
      setTenantsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    setFormSuccess(null);

    // Client-side validations
    const trimmedName = formData.name.trim();
    const processedCode = formData.code.trim().toLowerCase();
    const trimmedEmail = formData.email.trim().toLowerCase();

    if (!trimmedName) {
      setFormError('Nama bisnis wajib diisi.');
      setFormLoading(false);
      return;
    }
    if (!processedCode || !/^[a-z0-9-]+$/.test(processedCode)) {
      setFormError('Kode tenant wajib berupa huruf kecil, angka, dan strip (-) saja.');
      setFormLoading(false);
      return;
    }
    if (!trimmedEmail || !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setFormError('Format email owner tidak valid.');
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
        setFormSuccess(result.message);
        setFormData({ name: '', code: '', email: '' });
        // Close modal after delay and refresh list
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(null);
          fetchTenants();
        }, 2000);
      } else {
        setFormError(result.message);
      }
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setFormLoading(false);
    }
  };

  useEffect(() => {
    async function verifyAuth() {
      // 1. Check local storage simulation bypass first (only for development/testing DX)
      if (typeof window !== 'undefined') {
        const simulated = localStorage.getItem('pilin_super_admin_simulated');
        if (simulated === 'true') {
          setIsSuperAdmin(true);
          setIsSimulated(true);
          setLoading(false);
          return;
        }
      }

      try {
        const supabase = createClient();
        
        // Check active Supabase auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsSuperAdmin(false);
          setLoading(false);
          return;
        }

        // Call database RPC auth_is_super_admin()
        const { data, error } = await supabase.rpc('auth_is_super_admin');
        if (error) {
          console.error('Error invoking auth_is_super_admin RPC:', error);
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(!!data);
        }
      } catch (err) {
        console.error('Super Admin authorization check failed:', err);
        setIsSuperAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    verifyAuth();
  }, []);

  useEffect(() => {
    if (isSuperAdmin) {
      if (activeMenu === 'Dashboard') {
        fetchMetrics();
      } else if (activeMenu === 'Tenants') {
        fetchTenants();
      } else if (activeMenu === 'Subscriptions') {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans animate-pulse">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin mb-4" />
        <h1 className="text-sm font-bold text-white">Memuat Sistem Otorisasi Platform...</h1>
      </div>
    );
  }

  if (isSuperAdmin === false) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 relative z-10 text-center">
          <div className="inline-flex p-4 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-400 mb-2">
            <AlertTriangle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">Akses Terbatas</h1>
          
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-rose-300 text-center">
            Halaman ini memerlukan otorisasi Super Administrator. Pastikan akun Anda terdaftar di platform_role_assignments.
          </div>

          <div className="pt-4 space-y-3">
            <a 
              href="/"
              className="w-full block py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700"
            >
              Kembali ke Beranda
            </a>
            
            {/* Show Developer Mode Simulation Toggle (only on localhost/dev domain) */}
            {typeof window !== 'undefined' && 
             (window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1' || 
              window.location.hostname.includes('gitpod') || 
              window.location.hostname.includes('webcontainer')) && (
              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleSimulateLogin}
                  className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  ⚡ Simulasikan Login Super Admin (Local Dev)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Define sidebar menu list
  const menuItems = [
    { name: 'Dashboard', icon: LayoutGrid },
    { name: 'Tenants', icon: Building2 },
    { name: 'Users & Roles', icon: Users },
    { name: 'Subscriptions', icon: CreditCard },
    { name: 'Products / Services', icon: Layers },
    { name: 'Audit Log', icon: FileSpreadsheet }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      {/* Sidebar khusus Super Admin */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-2 py-1.5 border-b border-slate-800 pb-4">
            <ShieldCheck className="w-8 h-8 text-orange-500" />
            <h1 className="text-md font-black text-white uppercase tracking-wider">PILIN PLATFORM</h1>
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveMenu(item.name)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border ${
                    isActive 
                      ? 'bg-orange-600/10 border-orange-500 text-orange-400 shadow-inner' 
                      : 'border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="space-y-3">
          {isSimulated && (
            <div className="bg-orange-950/40 border border-orange-500/30 rounded-xl p-3 text-[10px] text-orange-400 font-mono text-center">
              Mode Simulasi Aktif
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6">
          <h1 className="text-sm font-bold text-white">Super Admin Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
              ROLE: PLATFORM_SUPER_ADMIN
            </span>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          {activeMenu === 'Dashboard' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-black text-white">Ikhtisar Platform</h2>
              
              {/* Dashboard Grid */}
              {metricsError && (
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 text-xs font-mono text-rose-300">
                  ⚠️ {metricsError}
                </div>
              )}

              <div className="grid grid-cols-5 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Tenants</h3>
                  <div className="text-2xl font-black text-white mt-2">
                    {metricsLoading ? (
                      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    ) : (
                      metrics?.totalTenants ?? 0
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Tenants</h3>
                  <div className="text-2xl font-black text-white mt-2">
                    {metricsLoading ? (
                      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    ) : (
                      metrics?.activeTenants ?? 0
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Subscriptions</h3>
                  <div className="text-2xl font-black text-white mt-2">
                    {metricsLoading ? (
                      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    ) : (
                      metrics?.activeSubscriptions ?? 0
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Monthly Revenue</h3>
                  <div className="text-lg font-black text-white mt-2 truncate">
                    {metricsLoading ? (
                      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    ) : (
                      new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                        minimumFractionDigits: 0
                      }).format(metrics?.monthlyRevenue ?? 0)
                    )}
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-xs text-slate-400 font-bold uppercase tracking-wider">Platform Usage</h3>
                  <div className="text-2xl font-black text-white mt-2">
                    {metricsLoading ? (
                      <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                    ) : (
                      metrics?.platformUsage !== null && metrics?.platformUsage !== undefined
                        ? metrics.platformUsage.toLocaleString('id-ID')
                        : 'N/A'
                    )}
                  </div>
                </div>

              </div>


              {/* Status Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-md font-bold text-white mb-4">Informasi Sistem</h3>
                <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/50">
                  <p className="text-xs text-slate-300 font-mono">
                    Dashboard Super Admin berhasil diinisialisasi. Hubungkan API / database trigger untuk mulai mempopulasikan metrik secara real-time.
                  </p>
                </div>
              </div>
            </div>
          ) : activeMenu === 'Tenants' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Daftar Tenant</h2>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={fetchTenants}
                    disabled={tenantsLoading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {tenantsLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                    <span>Segarkan Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center space-x-2"
                  >
                    <span>+ Create Tenant</span>
                  </button>
                </div>
              </div>

              {tenantsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat data tenant...</span>
                </div>
              ) : tenantsError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="inline-flex p-4 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-400 mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Gagal Memuat Data</h3>
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-rose-300 max-w-md mx-auto mb-4">
                    {tenantsError}
                  </div>
                  <button
                    type="button"
                    onClick={fetchTenants}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : tenants.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="inline-flex p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 mb-4">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Belum Ada Tenant</h3>
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400 max-w-md mx-auto">
                    Database tidak memiliki rekaman tenant aktif saat ini.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">Tenant</th>
                          <th className="p-4">Code</th>
                          <th className="p-4">Created</th>
                          <th className="p-4">Updated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {tenants.map((tenant) => (
                          <tr key={tenant.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-bold text-white">{tenant.name}</td>
                            <td className="p-4 font-mono text-slate-300">{tenant.code}</td>
                            <td className="p-4 text-slate-400">
                              {new Date(tenant.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="p-4 text-slate-400">
                              {new Date(tenant.updated_at).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeMenu === 'Subscriptions' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('tenant_products')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeSubTab === 'tenant_products'
                        ? 'bg-orange-600/10 text-orange-400 border border-orange-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Aktivasi Tenant
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('subscriptions')}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                      activeSubTab === 'subscriptions'
                        ? 'bg-orange-600/10 text-orange-400 border border-orange-500/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Kontrak Langganan
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fetchSubscriptionsData}
                  disabled={subsLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {subsLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                  <span>Segarkan Data</span>
                </button>
              </div>

              {subsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat data langganan & modul...</span>
                </div>
              ) : subsError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="inline-flex p-4 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-400 mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Gagal Memuat Data</h3>
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-rose-300 max-w-md mx-auto mb-4">
                    {subsError}
                  </div>
                  <button
                    type="button"
                    onClick={fetchSubscriptionsData}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : activeSubTab === 'tenant_products' ? (
                tenantProducts.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="inline-flex p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 mb-4">
                      <Layers className="w-8 h-8" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Belum Ada Aktivasi Produk</h3>
                    <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400 max-w-md mx-auto">
                      Belum ada instance produk aktif yang didaftarkan ke tenant.
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            <th className="p-4">Tenant Code / Name</th>
                            <th className="p-4">Product Code / Name</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Activated At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-xs">
                          {tenantProducts.map((tp) => (
                            <tr key={tp.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-white">{tp.tenants?.name || '—'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tp.tenants?.code || '—'}</div>
                              </td>
                              <td className="p-4">
                                <div className="font-bold text-white">{tp.platform_products?.name || '—'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tp.platform_products?.code || '—'}</div>
                              </td>
                              <td className="p-4">
                                {activationActionLoading === tp.id ? (
                                  <div className="flex items-center space-x-1.5 text-[10px] font-bold text-slate-400">
                                    <Loader2 className="w-3 h-3 text-orange-500 animate-spin" />
                                    <span>Memproses...</span>
                                  </div>
                                ) : (
                                  <select
                                    disabled={activationActionLoading !== null}
                                    value={tp.status || 'PENDING'}
                                    onChange={(e) => handleActivationStatusChange(tp.id, e.target.value)}
                                    className={`bg-slate-950 border text-[11px] rounded-lg px-2.5 py-1 font-bold focus:outline-none focus:border-orange-500 disabled:opacity-50 ${
                                      tp.status === 'ACTIVE'
                                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                                        : tp.status === 'SUSPENDED'
                                        ? 'border-amber-500/30 text-amber-400 bg-amber-950/20'
                                        : 'border-slate-800 text-slate-400'
                                    }`}
                                  >
                                    <option value="PENDING">PENDING</option>
                                    <option value="ACTIVE">ACTIVE</option>
                                    <option value="SUSPENDED">SUSPENDED</option>
                                    <option value="CANCELLED">CANCELLED</option>
                                  </select>
                                )}
                              </td>
                              <td className="p-4 text-slate-400">
                                {tp.activated_at ? new Date(tp.activated_at).toLocaleString('id-ID') : 'Not Activated'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : subscriptions.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="inline-flex p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 mb-4">
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Belum Ada Kontrak Langganan</h3>
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400 max-w-md mx-auto">
                    Database tidak memiliki rekaman kontrak langganan komersial saat ini.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">Customer Details</th>
                          <th className="p-4">Product</th>
                          <th className="p-4">Payment Info</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Created Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {subscriptions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-white">{sub.platform_customers?.name || '—'}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{sub.platform_customers?.email || '—'}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white">{sub.platform_products?.name || '—'}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sub.platform_products?.code || '—'}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-slate-200 font-medium">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(sub.platform_payments?.amount || 0)}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {sub.platform_payments?.payment_date ? new Date(sub.platform_payments.payment_date).toLocaleDateString('id-ID') : '—'}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                sub.status === 'ACTIVE'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : sub.status === 'PENDING'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : sub.status === 'SUSPENDED'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}>
                                {sub.status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400">
                              {new Date(sub.created_at).toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeMenu === 'Users & Roles' ? (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Manajemen Peran & Pengguna</h2>
                <button
                  type="button"
                  onClick={fetchPlatformUsers}
                  disabled={usersLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  {usersLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                  <span>Segarkan Data</span>
                </button>
              </div>

              {usersLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat data pengguna platform...</span>
                </div>
              ) : usersError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="inline-flex p-4 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-400 mb-4">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Gagal Memuat Data</h3>
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-rose-300 max-w-md mx-auto mb-4">
                    {usersError}
                  </div>
                  <button
                    type="button"
                    onClick={fetchPlatformUsers}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : platformUsers.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <div className="inline-flex p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 mb-4">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Belum Ada Pengguna Platform</h3>
                  <div className="mt-4 bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-400 max-w-md mx-auto">
                    Database tidak memiliki rekaman pengguna terdaftar saat ini.
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">User Email</th>
                          <th className="p-4">Registered / Confirmed</th>
                          <th className="p-4">Last Sign In</th>
                          <th className="p-4">Active Platform Role</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {platformUsers.map((u) => {
                          const hasActiveRole = u.role_code && u.role_code !== 'None' && u.is_active;
                          const currentRole = hasActiveRole ? u.role_code : 'None';
                          return (
                            <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                              <td className="p-4">
                                <div className="font-bold text-white">{u.email}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.id}</div>
                              </td>
                              <td className="p-4">
                                <div className="text-slate-300">{new Date(u.created_at).toLocaleDateString('id-ID')}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {u.email_confirmed_at ? 'Email Confirmed' : 'Not Confirmed'}
                                </div>
                              </td>
                              <td className="p-4 text-slate-400">
                                {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('id-ID') : '—'}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  hasActiveRole
                                    ? u.role_code === 'SUPER_ADMIN'
                                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                      : u.role_code === 'sales'
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {currentRole}
                                </span>
                              </td>
                              <td className="p-4">
                                <select
                                  disabled={roleActionLoading !== null}
                                  value={currentRole}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  className="bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded-lg px-2 py-1 font-bold focus:outline-none focus:border-orange-500 disabled:opacity-50"
                                >
                                  <option value="None">None (Revoked)</option>
                                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                                  <option value="sales">sales</option>
                                  <option value="finance">finance</option>
                                </select>
                                {roleActionLoading === u.id && (
                                  <Loader2 className="w-3.5 h-3.5 text-orange-500 animate-spin inline-block ml-2 align-middle" />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeMenu === 'Products / Services' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Katalog Produk & Layanan</h2>
                <button
                  type="button"
                  onClick={fetchPlatformProducts}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50"
                >
                  {productsLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                  <span>Segarkan Data</span>
                </button>
              </div>

              {productsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat katalog produk...</span>
                </div>
              ) : productsError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs text-rose-400 border-rose-500/20 bg-rose-950/20">
                  ⚠️ {productsError}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">Product Code</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {platformProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 font-mono font-bold text-orange-400">{p.code}</td>
                            <td className="p-4 font-bold text-white">{p.name}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                p.product_type === 'MAIN'
                                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                  : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                              }`}>
                                {p.product_type}
                              </span>
                            </td>
                            <td className="p-4 text-slate-400">{p.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : activeMenu === 'Audit Log' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Log Audit Platform</h2>
                <button
                  type="button"
                  onClick={fetchAuditLogs}
                  className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all border border-slate-700 disabled:opacity-50"
                >
                  {logsLoading && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
                  <span>Segarkan Data</span>
                </button>
              </div>

              {logsLoading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                  <span className="text-xs font-bold text-slate-400">Memuat log audit platform...</span>
                </div>
              ) : logsError ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-xs text-rose-400 border-rose-500/20 bg-rose-950/20">
                  ⚠️ {logsError}
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          <th className="p-4">Timestamp</th>
                          <th className="p-4">Operation</th>
                          <th className="p-4">Entity</th>
                          <th className="p-4">Payload</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-xs">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4 text-slate-400 font-mono">
                              {new Date(log.created_at).toLocaleString('id-ID')}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                log.operation.includes('REVOKE') || log.operation.includes('DELETE')
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                                  : log.operation.includes('ASSIGN') || log.operation.includes('ACTIVATE')
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {log.operation}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-white">{log.entity}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{log.entity_id || '—'}</div>
                            </td>
                            <td className="p-4 max-w-xs truncate font-mono text-[10px] text-slate-300">
                              {JSON.stringify(log.payload_sanitized)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="inline-flex p-4 rounded-full bg-slate-800 border border-slate-700 text-slate-400 mb-4">
                <Settings className="w-8 h-8 animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-white">{activeMenu}</h2>
              <div className="mt-4 p-3 bg-slate-950/50 rounded-xl max-w-sm border border-slate-800">
                <p className="text-xs text-slate-400 font-mono">
                  Modul ini sedang dalam tahap pengembangan.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 relative animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-md font-bold text-white">Create New Tenant</h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                  setFormSuccess(null);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold transition-all"
              >
                Close
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-xs">Business Name</label>
                <input
                  type="text"
                  required
                  disabled={formLoading}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-xs">Tenant Code</label>
                <input
                  type="text"
                  required
                  disabled={formLoading}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. minara-salon"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 disabled:opacity-50 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block text-xs">Owner Email</label>
                <input
                  type="email"
                  required
                  disabled={formLoading}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="owner@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 disabled:opacity-50"
                />
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  disabled={formLoading}
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError(null);
                    setFormSuccess(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-slate-950 font-bold text-xs rounded-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{formLoading ? 'Creating tenant...' : 'Create Tenant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
