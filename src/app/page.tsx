'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerDashboard } from '@/components/management/OwnerDashboard';
import { ManagementControlDashboard } from '@/components/management/ManagementControlDashboard';
import { KasirTransactionWorkspace } from '@/components/commerce/KasirTransactionWorkspace';
import { TeamProduksiWorkspace } from '@/components/production/TeamProduksiWorkspace';
import { DashboardTopBar, DashboardRole } from '@/components/layout/DashboardTopBar';
import { LoginGate } from '@/components/auth/LoginGate';
import { AccessBlockedScreen } from '@/components/auth/AccessBlockedScreen';
import { PeopleRepository } from '@/domains/people/peopleRepository';

function MainErpAppContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as DashboardRole | null;
  const directParam = searchParams.get('direct');
  const demoParam = searchParams.get('demo') === 'true' || searchParams.get('mode') === 'demo';

  const [activeRole, setActiveRole] = useState<DashboardRole | null>(null);
  const [activeUserName, setActiveUserName] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(demoParam);

  const targetBusinessId = isDemoMode ? 'demo-tenant' : 'tenant-001';

  useEffect(() => {
    if (demoParam) {
      setIsDemoMode(true);
    } else if (searchParams.get('mode') === 'live') {
      setIsDemoMode(false);
    }
  }, [demoParam, searchParams]);

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

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && activeRole) {
      if (activeRole === 'OWNER' || isDemoMode) {
        setIsAuthorized(true);
      } else {
        PeopleRepository.hasAuthorizedEmployeeForRole(targetBusinessId, activeRole).then((authorized) => {
          if (isMounted) setIsAuthorized(authorized);
        });
      }
    } else {
      setIsAuthorized(null);
    }
    return () => { isMounted = false; };
  }, [isAuthenticated, activeRole, isDemoMode, targetBusinessId]);

  const handleLoginSuccess = (role: DashboardRole, name: string, isDemo: boolean = false) => {
    setActiveRole(role);
    setActiveUserName(name);
    setIsDemoMode(isDemo);
    setIsAuthenticated(true);
  };

  const handleRoleChange = (newRole: DashboardRole) => {
    setActiveRole(newRole);
    const defaultNames: Record<string, string> = {
      OWNER: isDemoMode ? 'Demo Owner' : 'Owner',
      KEPALA_CABANG: isDemoMode ? 'Demo Kepala Cabang' : 'Kepala Cabang',
      KASIR: isDemoMode ? 'Demo Kasir' : 'Kasir',
      TEAM_PRODUKSI: isDemoMode ? 'Demo Tim Produksi' : 'Tim Produksi',
      PEGAWAI: isDemoMode ? 'Demo Tim Produksi' : 'Tim Produksi',
    };
    setActiveUserName(defaultNames[newRole] || newRole);
    if (typeof window !== 'undefined') {
      const mode = isDemoMode ? 'demo' : 'live';
      window.history.replaceState({}, '', `?mode=${mode}&role=${newRole}&direct=true`);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveRole(null);
    setActiveUserName('');
    setIsAuthorized(null);
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // 1. UNAUTHENTICATED: LOGIN GATE WITH 2 JALUR SELECTOR
  if (!isAuthenticated || !activeRole) {
    return (
      <LoginGate
        defaultRole={roleParam === ('PEGAWAI' as any) ? 'TEAM_PRODUKSI' : roleParam}
        initialTrack={isDemoMode ? 'DEMO' : 'LIVE'}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // 2. CHECK AUTHORIZATION STATE FOR NON-OWNER ROLES
  if (isAuthorized === false) {
    const displayRoleName =
      activeRole === 'KEPALA_CABANG' ? 'Kepala Cabang' :
      activeRole === 'KASIR' ? 'Kasir' :
      'Team Produksi';

    return <AccessBlockedScreen roleName={displayRoleName} onBackToLogin={handleLogout} />;
  }

  // Loading state during authorization verification
  if (isAuthorized === null && activeRole !== 'OWNER') {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-bold tracking-wider uppercase text-slate-400">Memeriksa Otorisasi Pegawai...</div>
        </div>
      </div>
    );
  }

  // 3. OWNER ERP WORKSPACE
  if (activeRole === 'OWNER') {
    return (
      <OwnerDashboard
        businessId={targetBusinessId}
        branchId="branch-001"
        actorUserId="user-owner-01"
        isDemo={isDemoMode}
        onRoleChange={handleRoleChange}
        onLogout={handleLogout}
      />
    );
  }

  // 4. KASIR DEDICATED ERP WORKSPACE
  if (activeRole === 'KASIR') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <DashboardTopBar
          role="KASIR"
          userName={activeUserName}
          onLogout={handleLogout}
          onRoleChange={handleRoleChange}
          isDemo={isDemoMode}
          businessId={targetBusinessId}
        />
        <main className="flex-1 w-full p-4 sm:p-6 space-y-6">
          <KasirTransactionWorkspace
            actorUserId="user-kasir-01"
            actorName={activeUserName || 'Kasir'}
            businessId={targetBusinessId}
            branchId="branch-001"
            isDemo={isDemoMode}
          />
        </main>
      </div>
    );
  }

  // 5. TEAM PRODUKSI DEDICATED ERP WORKSPACE
  if (activeRole === 'TEAM_PRODUKSI') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        <DashboardTopBar
          role="TEAM_PRODUKSI"
          userName={activeUserName}
          onLogout={handleLogout}
          onRoleChange={handleRoleChange}
          isDemo={isDemoMode}
          businessId={targetBusinessId}
        />
        <main className="flex-1 w-full p-4 sm:p-6 space-y-6">
          <TeamProduksiWorkspace
            actorUserId="user-prod-01"
            actorName={activeUserName || 'Tim Produksi'}
            businessId={targetBusinessId}
            branchId="branch-001"
            isDemo={isDemoMode}
          />
        </main>
      </div>
    );
  }

  // 6. KEPALA CABANG ERP WORKSPACE
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      <DashboardTopBar
        role="KEPALA_CABANG"
        userName={activeUserName}
        onLogout={handleLogout}
        onRoleChange={handleRoleChange}
        isDemo={isDemoMode}
        businessId={targetBusinessId}
      />
      <div className="flex-1 w-full flex">
        <ManagementControlDashboard
          actorUserId="user-kc-01"
          actorRole="KEPALA_CABANG"
          businessId={targetBusinessId}
          branchId="branch-001"
          isDemo={isDemoMode}
        />
      </div>
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
