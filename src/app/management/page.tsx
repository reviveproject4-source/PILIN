'use client';

import React, { useState } from 'react';
import { ManagementControlDashboard } from '../../components/management/ManagementControlDashboard';
import { PeopleManagementDashboard } from '../../components/people/PeopleManagementDashboard';
import { ManagementRole } from '../../domains/management/managementAuthorization';
import { DashboardTopBar } from '@/components/layout/DashboardTopBar';

export default function ManagementPage() {
  const [businessId] = useState<string>('tenant-001');
  const [branchId] = useState<string>('branch-001');
  const [actorUserId] = useState<string>('user-owner-01');
  const [actorRole] = useState<ManagementRole>('OWNER');
  const [mainView, setMainView] = useState<'MANAGEMENT' | 'PEOPLE'>('PEOPLE');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Clean Top Bar Header */}
      <DashboardTopBar role="KEPALA_CABANG" />

      {mainView === 'PEOPLE' ? (
        <PeopleManagementDashboard
          businessId={businessId}
          branchId={branchId}
          actorUserId={actorUserId}
          actorRole={actorRole}
        />
      ) : (
        <ManagementControlDashboard
          businessId={businessId}
          branchId={branchId}
          actorUserId={actorUserId}
          actorRole={actorRole}
        />
      )}
    </div>
  );
}
