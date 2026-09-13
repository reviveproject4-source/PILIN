'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerDashboard } from '@/components/management/OwnerDashboard';
import { ManagementControlDashboard } from '@/components/management/ManagementControlDashboard';
import { KasirTransactionWorkspace } from '@/components/commerce/KasirTransactionWorkspace';
import { TeamProduksiWorkspace } from '@/components/production/TeamProduksiWorkspace';
import { DashboardTopBar, DashboardRole } from '@/components/layout/DashboardTopBar';
import { LoginGate } from '@/components/auth/LoginGate';

function MainErpAppContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as DashboardRole | null;
  const directParam = searchParams.get('direct');

  const [activeRole, setActiveRole] = useState<DashboardRole | null>(null);
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (roleParam) {
      const targetRole = roleParam === ('PEGAWAI' as any) ? 'TEAM_PRODUKSI' : roleParam;
      if (['OWNER', 'KEPALA_CABANG', 'KASIR', 'TEAM_PRODUKSI'].includes(targetRole)) {
        if (directParam === 'true') {
          setActiveRole(targetRole);
          setIsAuthenticated(true);
        }
      }
    }
  }, [roleParam, directParam]);

  const handleLoginSuccess = (role: DashboardRole, name: string) => {
    setActiveRole(role);
    setActiveUserName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveRole(null);
    setActiveUserName('');
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // 1. UNAUTHENTICATED: LOGIN GATE
  if (!isAuthenticated || !activeRole) {
    return (
      <LoginGate
        defaultRole={roleParam === ('PEGAWAI' as any) ? 'TEAM_PRODUKSI' : roleParam}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // 2. OWNER ERP WORKSPACE
  if (activeRole === 'OWNER') {
    return (
      <OwnerDashboard
        businessId="tenant-001"
        branchId="branch-001"
        actorUserId="user-owner-01"
        onRoleChange={(role) => setActiveRole(role as DashboardRole)}
        onLogout={handleLogout}
      />
    );
  }

  // 3. KASIR DEDICATED ERP WORKSPACE
  if (activeRole === 'KASIR') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <DashboardTopBar role="KASIR" userName={activeUserName} onLogout={handleLogout} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <KasirTransactionWorkspace
            actorUserId="user-kasir-01"
            actorName={activeUserName || 'Siti Rahma'}
            businessId="tenant-001"
            branchId="branch-001"
          />
        </main>
      </div>
    );
  }

  // 4. TEAM PRODUKSI DEDICATED ERP WORKSPACE
  if (activeRole === 'TEAM_PRODUKSI') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <DashboardTopBar role="TEAM_PRODUKSI" userName={activeUserName} onLogout={handleLogout} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <TeamProduksiWorkspace
            actorUserId="user-prod-01"
            actorName={activeUserName || 'Tim Produksi Staf'}
            businessId="tenant-001"
            branchId="branch-001"
          />
        </main>
      </div>
    );
  }

  // 5. KEPALA CABANG ERP WORKSPACE
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <DashboardTopBar role="KEPALA_CABANG" userName={activeUserName} onLogout={handleLogout} />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        <ManagementControlDashboard
          actorUserId="user-kc-01"
          actorRole="KEPALA_CABANG"
          businessId="tenant-001"
          branchId="branch-001"
        />
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-bold tracking-wider uppercase text-slate-400">Memuat PILIN ERP Login Gate...</div>
        </div>
      </div>
    }>
      <MainErpAppContent />
    </Suspense>
  );
}
