'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ManagementControlDashboard } from '@/components/management/ManagementControlDashboard';
import { PeopleManagementDashboard } from '@/components/people/PeopleManagementDashboard';
import { ManagementRole } from '@/domains/management/managementAuthorization';
import { ArrowLeft, Building2, Users, LayoutDashboard, ExternalLink } from 'lucide-react';

export default function DashboardPortalPage() {
  const [activeRole, setActiveRole] = useState<ManagementRole>('OWNER');
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'PEOPLE'>('MANAGEMENT');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-[#0F2547] text-white px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors bg-slate-800/80 px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ke Website PILIN</span>
          </Link>
          <div className="h-5 w-px bg-slate-700"></div>
          <div className="flex items-center space-x-3">
            <span className="w-3 h-3 rounded-full bg-[#F26522]"></span>
            <span className="font-bold text-white tracking-wide text-lg">PILIN ERP Operational Portal</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-slate-900/60 border border-slate-700/80 px-3 py-1.5 rounded-lg">
            <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Akses Role:</label>
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value as ManagementRole)}
              className="bg-[#0F2547] text-[#F26522] font-bold text-sm focus:outline-none cursor-pointer"
            >
              <option value="OWNER">OWNER</option>
              <option value="KEPALA_CABANG">KEPALA CABANG</option>
              <option value="PEGAWAI">PEGAWAI</option>
            </select>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('MANAGEMENT')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'MANAGEMENT'
                  ? 'bg-[#F26522] text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Management Control</span>
            </button>
            <button
              onClick={() => setActiveTab('PEOPLE')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center space-x-2 ${
                activeTab === 'PEOPLE'
                  ? 'bg-[#F26522] text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>People & Employee</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'MANAGEMENT' ? (
          <ManagementControlDashboard
            actorUserId="user-owner-01"
            actorRole={activeRole}
            businessId="tenant-001"
            branchId="branch-001"
          />
        ) : (
          <PeopleManagementDashboard
            actorUserId="user-owner-01"
            actorRole={activeRole}
            businessId="tenant-001"
          />
        )}
      </main>
    </div>
  );
}
