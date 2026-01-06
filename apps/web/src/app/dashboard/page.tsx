'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { DEFAULT_FARM_ID } from '../../lib/config';
import { usePolling } from '../../lib/polling';

type DashboardResponse = {
  farmId: string;
  offlineAfterMin: number;
  zones: Array<{
    zoneId: string;
    deviceId?: string;
    lastUpdatedAt?: string;
    kpis: Record<string, number | undefined>;
    activeAlerts: number;
    device: { name?: string; lastSeenAt?: string | null; online: boolean };
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setData(await apiGet<DashboardResponse>(`/v1/dashboard?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  usePolling(() => void load(), 30_000);
  useEffect(() => void load(), []);

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {!data ? <p>Loading…</p> : null}
      {data ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {data.zones.map((z) => (
            <a
              key={z.zoneId}
              href={`/zones/${encodeURIComponent(z.zoneId)}`}
              style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ fontWeight: 700 }}>{z.zoneId}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{z.device.online ? 'Online' : 'Offline'}</div>
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{z.device.name ?? z.deviceId ?? ''}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10, fontSize: 13 }}>
                <Kpi label="Temp" value={z.kpis.airTemp} suffix="°C" />
                <Kpi label="RH" value={z.kpis.airRH} suffix="%" />
                <Kpi label="VPD" value={z.kpis.vpd} suffix="kPa" />
                <Kpi label="Soil" value={z.kpis.soilAvg} suffix="%" />
                <Kpi label="PAR" value={z.kpis.par} />
                <Kpi label="EC" value={z.kpis.ec} />
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                Active alerts: <b>{z.activeAlerts}</b>
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function Kpi({ label, value, suffix }: { label: string; value: number | undefined; suffix?: string }) {
  return (
    <div style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 8 }}>
      <div style={{ fontSize: 11, color: '#666' }}>{label}</div>
      <div style={{ fontWeight: 700 }}>
        {typeof value === 'number' ? value.toFixed(2) : '—'}
        {suffix ? <span style={{ fontWeight: 400, color: '#666', marginLeft: 4 }}>{suffix}</span> : null}
      </div>
    </div>
  );
}

