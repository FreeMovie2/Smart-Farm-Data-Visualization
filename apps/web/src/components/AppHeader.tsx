'use client';

import { useEffect, useState } from 'react';
import type { UserRole } from '../lib/role';
import { getStoredRole, setStoredRole } from '../lib/role';

export function AppHeader() {
  const [role, setRole] = useState<UserRole>('operator');

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  const onChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setStoredRole(nextRole);
  };

  return (
    <header style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', gap: 12, alignItems: 'center' }}>
      <a href="/dashboard" style={{ textDecoration: 'none', color: 'inherit', fontWeight: 700 }}>
        Smart Farm
      </a>
      <nav style={{ display: 'flex', gap: 12, fontSize: 14 }}>
        <a href="/dashboard">Dashboard</a>
        <a href="/alerts">Alerts</a>
        <a href="/devices">Devices</a>
        <a href="/events">Events</a>
        <a href="/reports">Reports</a>
      </nav>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#666' }}>Role</span>
        <select value={role} onChange={(e) => onChange(e.target.value as UserRole)}>
          <option value="owner">Owner</option>
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
        </select>
      </div>
    </header>
  );
}

