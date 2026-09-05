'use client';

import React, { useState } from 'react';
import { ManagementControlDashboard } from '../../components/management/ManagementControlDashboard';
import { PeopleManagementDashboard } from '../../components/people/PeopleManagementDashboard';
import { ManagementRole } from '../../domains/management/managementAuthorization';

export default function ManagementPage() {
  const [businessId, setBusinessId] = useState<string>('tenant-001');
  const [branchId, setBranchId] = useState<string>('branch-001');
  const [actorUserId, setActorUserId] = useState<string>('user-owner-01');
  const [actorRole, setActorRole] = useState<ManagementRole>('OWNER');
  const [mainView, setMainView] = useState<'MANAGEMENT' | 'PEOPLE'>('PEOPLE');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Control Switcher Bar for Role & Context Inspection */}
      <div className="bg-[#0F2547] px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-200 shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F26522]"></span>
            <span className="font-bold text-white tracking-wide text-sm">PILIN Management Portal</span>
          </div>
          <div className="flex items-center space-x-2 border-l border-slate-700 pl-6">
            <label className="text-slate-300 font-medium">Role Akses:</label>
            <select
              value={actorRole}
              onChange={(e) => setActorRole(e.target.value as ManagementRole)}
              className="bg-[#0B1A32] border border-slate-700 text-[#F26522] px-3 py-1.5 rounded-lg font-bold focus:outline-none focus:ring-1 focus:ring-[#F26522]"
            >
              <option value="OWNER">OWNER</option>
              <option value="KEPALA_CABANG">KEPALA CABANG</option>
              <option value="PEGAWAI">PEGAWAI</option>
            </select>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-[#0B1A32] p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMainView('PEOPLE')}
            className={`px-4 py-1.5 rounded-md font-semibold transition-all ${
              mainView === 'PEOPLE'
                ? 'bg-[#F26522] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            👥 People / Pegawai
          </button>
          <button
            onClick={() => setMainView('MANAGEMENT')}
            className={`px-4 py-1.5 rounded-md font-semibold transition-all ${
              mainView === 'MANAGEMENT'
                ? 'bg-[#F26522] text-white shadow-sm'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            📊 Control & Monitoring
          </button>
        </div>
      </div>

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
