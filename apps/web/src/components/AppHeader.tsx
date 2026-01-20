'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { UserRole } from '../lib/role';
import { getStoredRole, setStoredRole } from '../lib/role';

export function AppHeader({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('operator');

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  const onChange = (nextRole: UserRole) => {
    setRole(nextRole);
    setStoredRole(nextRole);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <a href="/dashboard" className="brand-link">
            Smart Farm
          </a>
          <div className="brand-subtitle">Monitoring</div>
        </div>

        <nav className="sidebar-nav">
          <a className="sidebar-link" href="/dashboard">
            Dashboard
          </a>
          <a className="sidebar-link" href="/alerts">
            Alerts
          </a>
          <a className="sidebar-link" href="/devices">
            Devices
          </a>
          <a className="sidebar-link" href="/events">
            Events
          </a>
          <a className="sidebar-link" href="/reports">
            Reports
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-meta">Data Visualization</div>
        </div>
      </aside>

      <div className="workarea">
        <header className="topbar">
          <div className="topbar-left">Smart Farm Monitoring System</div>
          <div className="topbar-right">
            <span className="topbar-label">Role</span>
            <select className="input input--compact" value={role} onChange={(e) => onChange(e.target.value as UserRole)}>
              <option value="owner">Owner</option>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}

