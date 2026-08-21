'use client';

import React, { useState } from 'react';
import { ManagementControlDashboard } from '../../components/management/ManagementControlDashboard';
import { ManagementRole } from '../../domains/management/managementAuthorization';

export default function ManagementPage() {
  const [businessId, setBusinessId] = useState<string>('tenant-001');
  const [branchId, setBranchId] = useState<string>('branch-alpha');
  const [actorUserId, setActorUserId] = useState<string>('user-owner-01');
  const [actorRole, setActorRole] = useState<ManagementRole>('OWNER');

  return (
    <div>
      {/* Control Switcher Bar for Role & Context Inspection */}
      <div style={{ background: '#090d16', padding: '12px 24px', borderBottom: '1px solid #1e293b', display: 'flex', gap: '20px', alignItems: 'center', fontSize: '13px', color: '#94a3b8' }}>
        <div>
          <label style={{ marginRight: '6px' }}>Tenant ID:</label>
          <input
            value={businessId}
            onChange={(e) => setBusinessId(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label style={{ marginRight: '6px' }}>Branch ID:</label>
          <input
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label style={{ marginRight: '6px' }}>User ID:</label>
          <input
            value={actorUserId}
            onChange={(e) => setActorUserId(e.target.value)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', padding: '4px 8px', borderRadius: '4px' }}
          />
        </div>
        <div>
          <label style={{ marginRight: '6px', fontWeight: 'bold', color: '#fbbf24' }}>Simulated Role:</label>
          <select
            value={actorRole}
            onChange={(e) => setActorRole(e.target.value as ManagementRole)}
            style={{ background: '#1e293b', border: '1px solid #334155', color: '#fbbf24', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}
          >
            <option value="OWNER">OWNER</option>
            <option value="KEPALA_CABANG">KEPALA_CABANG</option>
            <option value="PEGAWAI">PEGAWAI</option>
          </select>
        </div>
      </div>

      <ManagementControlDashboard
        businessId={businessId}
        branchId={branchId}
        actorUserId={actorUserId}
        actorRole={actorRole}
      />
    </div>
  );
}
