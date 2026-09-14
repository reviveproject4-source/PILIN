'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OwnerDashboard } from '@/components/management/OwnerDashboard';
import { ManagementControlDashboard } from '@/components/management/ManagementControlDashboard';
import { PegawaiTaskWorkspace } from '@/components/people/PegawaiTaskWorkspace';
import { PeopleManagementDashboard } from '@/components/people/PeopleManagementDashboard';
import { FinanceHppDashboard } from '@/components/finance/FinanceHppDashboard';
import { ProductMasterDashboard } from '@/components/catalog/ProductMasterDashboard';
import { PresensiModule } from '@/components/people/PresensiModule';
import { KasirTransactionWorkspace } from '@/components/commerce/KasirTransactionWorkspace';
import { TeamProduksiWorkspace } from '@/components/production/TeamProduksiWorkspace';
import { DashboardTopBar, DashboardRole } from '@/components/layout/DashboardTopBar';
import { ShoppingCart, Wrench, CheckCircle2, Clock, FileText, Send, AlertTriangle } from 'lucide-react';

function DashboardContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as DashboardRole | null;
  const isDemoMode = searchParams.get('demo') === 'true' || searchParams.get('mode') === 'demo';
  const [activeRole, setActiveRole] = useState<DashboardRole>('OWNER');

  useEffect(() => {
    if (roleParam === 'PEGAWAI') {
      setActiveRole('TEAM_PRODUKSI');
    } else if (roleParam && ['OWNER', 'KEPALA_CABANG', 'KASIR', 'TEAM_PRODUKSI'].includes(roleParam)) {
      setActiveRole(roleParam);
    }
  }, [roleParam]);

  // 1. OWNER ROLE DASHBOARD
  if (activeRole === 'OWNER') {
    return (
      <OwnerDashboard
        businessId="tenant-001"
        branchId="branch-001"
        actorUserId="user-owner-01"
        isDemo={isDemoMode}
        onRoleChange={(role) => setActiveRole(role as DashboardRole)}
      />
    );
  }

  // 2. PEGAWAI ROLE -> REDIRECT TO TEAM_PRODUKSI
  if (activeRole === 'PEGAWAI') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <DashboardTopBar role="TEAM_PRODUKSI" />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <TeamProduksiWorkspace
            actorUserId="user-prod-01"
            actorName="Tim Produksi Staf"
            businessId="tenant-001"
            branchId="branch-001"
          />
        </main>
      </div>
    );
  }

  // 3. KASIR DEDICATED TRANSACTION DASHBOARD
  if (activeRole === 'KASIR') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <DashboardTopBar role="KASIR" />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <KasirTransactionWorkspace
            actorUserId="user-kasir-01"
            actorName="Siti Rahma"
            businessId="tenant-001"
            branchId="branch-001"
          />
        </main>
      </div>
    );
  }

  // 4. TEAM PRODUKSI DEDICATED WORKSPACE
  if (activeRole === 'TEAM_PRODUKSI') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <DashboardTopBar role="TEAM_PRODUKSI" />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
          <TeamProduksiWorkspace
            actorUserId="user-prod-01"
            actorName="Tim Produksi Staf"
            businessId="tenant-001"
            branchId="branch-001"
          />
        </main>
      </div>
    );
  }

  // 5. KEPALA CABANG ROLE DASHBOARD (DEFAULT FALLBACK FOR KC)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <DashboardTopBar role="KEPALA_CABANG" />
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

export default function DashboardPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#F26522] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-bold tracking-wider uppercase text-slate-400">Memuat Dashboard PILIN ERP...</div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}


