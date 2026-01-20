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

type ZoneSummary = DashboardResponse['zones'][number];
type HealthResponse = { ok: boolean };

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; checkedAt: string } | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setData(await apiGet<DashboardResponse>(`/v1/dashboard?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadHealth = async () => {
    try {
      setHealthError(null);
      const res = await apiGet<HealthResponse>('/health');
      setHealth({ ok: !!res.ok, checkedAt: new Date().toISOString() });
    } catch (e) {
      setHealthError((e as Error).message);
      setHealth({ ok: false, checkedAt: new Date().toISOString() });
    }
  };

  usePolling(() => void load(), 30_000);
  usePolling(() => void loadHealth(), 10_000);
  useEffect(() => void load(), []);
  useEffect(() => void loadHealth(), []);

  const summary = data
    ? {
        zonesTotal: data.zones.length,
        zonesOnline: data.zones.filter((z) => z.device.online).length,
        zonesOffline: data.zones.filter((z) => !z.device.online).length,
        alertsTotal: data.zones.reduce((sum, z) => sum + z.activeAlerts, 0),
        offlineAfterMin: data.offlineAfterMin,
      }
    : null;

  const lastDataAt = data
    ? data.zones
        .map((z) => z.lastUpdatedAt)
        .filter((v): v is string => typeof v === 'string')
        .sort()
        .at(-1) ?? null
    : null;

  return (
    <main>
      <h1 className="page-title">Dashboard</h1>
      {error ? <p className="error">{error}</p> : null}
      {!data ? <p className="muted">Loading...</p> : null}
      {data ? (
        <>
          {summary ? (
            <section className="card" style={{ padding: 10, marginBottom: 10 }}>
              <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
                <Stat label="Zones" value={String(summary.zonesTotal)} />
                <Stat label="Online" value={String(summary.zonesOnline)} />
                <Stat label="Offline" value={String(summary.zonesOffline)} />
                <Stat label="Active alerts" value={String(summary.alertsTotal)} tone={summary.alertsTotal > 0 ? 'bad' : 'muted'} />
                <Stat label="Offline after" value={`${summary.offlineAfterMin} min`} />
                <Stat label="API" value={health?.ok ? 'OK' : 'Down'} tone={health?.ok ? 'muted' : 'bad'} />
                <Stat label="Last data" value={lastDataAt ? formatAge(lastDataAt) : 'N/A'} tone={lastDataAt ? 'muted' : 'bad'} />
              </div>
              {healthError ? (
                <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                  API check: {healthError}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="grid grid-cards">
            {data.zones.map((z) => (
              <ZoneCard key={z.zoneId} zone={z} />
            ))}
          </div>
        </>
      ) : null}
    </main>
  );
}

function ZoneCard({ zone }: { zone: ZoneSummary }) {
  const deviceLabel = zone.device.name ?? zone.deviceId ?? '';
  const isOnline = zone.device.online;

  return (
    <a className="card card-link zone-card" href={`/zones/${encodeURIComponent(zone.zoneId)}`}
    >
      <div className="zone-header">
        <div style={{ minWidth: 0 }}>
          <div className="zone-title">{zone.zoneId}</div>
          <div className="zone-subtitle">{deviceLabel}</div>
          {zone.lastUpdatedAt ? <div className="zone-meta">Last update: {zone.lastUpdatedAt}</div> : null}
        </div>

        <div className="badge">
          <span className={isOnline ? 'dot dot-ok' : 'dot dot-bad'} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      <div className="zone-body">
        <div className="metric-grid">
          <Metric label="Temp" value={zone.kpis.airTemp} unit={'\u00B0C'} />
          <Metric label="RH" value={zone.kpis.airRH} unit="%" />
          <Metric label="VPD" value={zone.kpis.vpd} unit="kPa" />
          <Metric label="Soil Avg" value={zone.kpis.soilAvg} unit="%" />
          <Metric label="PAR" value={zone.kpis.par} />
          <Metric label="EC" value={zone.kpis.ec} />
        </div>

        <div className="zone-footer">
          <div>
            Active alerts:{' '}
            <span className={zone.activeAlerts > 0 ? 'alerts-bad' : undefined}>{zone.activeAlerts}</span>
          </div>
          <span className="link">Details -&gt;</span>
        </div>
      </div>
    </a>
  );
}

function Metric({ label, value, unit }: { label: string; value: number | undefined; unit?: string }) {
  return (
    <div className="metric">
      <div className="metric-label">
        <span>{label}</span>
        <span className="dot" style={{ width: 6, height: 6, background: 'rgba(19,23,20,0.28)' }} />
      </div>
      <div className="metric-value">
        {typeof value === 'number' ? value.toFixed(2) : 'N/A'}
        {unit ? <span className="metric-unit">{unit}</span> : null}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'bad' | 'muted' }) {
  return (
    <div className="metric" style={{ minHeight: 52 }}>
      <div className="metric-label">
        <span>{label}</span>
        <span className="dot" style={{ width: 6, height: 6, background: 'rgba(19,23,20,0.28)' }} />
      </div>
      <div className="metric-value" style={{ marginTop: 4, fontSize: 15, color: tone === 'bad' ? 'var(--bad)' : undefined }}>
        {value}
      </div>
    </div>
  );
}

function formatAge(iso: string) {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return iso;
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}
