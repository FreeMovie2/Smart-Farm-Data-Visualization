'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../lib/api';
import { API_BASE_URL, DEFAULT_FARM_ID } from '../../lib/config';

type SummaryResponse = {
  zoneId: string;
  from: string;
  to: string;
  metrics: Record<string, { avg: number; min: number; max: number }>;
};

type ZoneComparisonResponse = {
  farmId: string;
  metricKey: string;
  from: string;
  to: string;
  zones: Array<{ zoneId: string; avg: number; min: number; max: number }>;
};

type SensorHealthResponse = {
  farmId: string;
  offlineAfterMin: number;
  windowMin: number;
  devices: Array<{
    deviceId: string;
    zoneId: string;
    name: string;
    lastSeenAt: string | null;
    online: boolean;
    lastReadingAt: string | null;
    pointsInWindow: number;
    distinctMetricsInWindow: number;
  }>;
};

export default function ReportsPage() {
  const [zoneId, setZoneId] = useState('zone-1');
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [compareMetricKey, setCompareMetricKey] = useState('airTemp');
  const [compare, setCompare] = useState<ZoneComparisonResponse | null>(null);
  const [health, setHealth] = useState<SensorHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = async () => {
    try {
      setError(null);
      setData(await apiGet<SummaryResponse>(`/v1/reports/summary?zoneId=${encodeURIComponent(zoneId)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadComparison = async () => {
    try {
      setError(null);
      setCompare(
        await apiGet<ZoneComparisonResponse>(
          `/v1/reports/zone-comparison?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}&metricKey=${encodeURIComponent(compareMetricKey)}`,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadHealth = async () => {
    try {
      setError(null);
      setHealth(await apiGet<SensorHealthResponse>(`/v1/reports/sensor-health?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => void loadSummary(), [zoneId]);
  useEffect(() => void loadComparison(), [compareMetricKey]);
  useEffect(() => void loadHealth(), []);

  const rows = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.metrics).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const exportUrl = useMemo(() => {
    const url = new URL(`${API_BASE_URL}/v1/reports/zone-series.csv`);
    url.searchParams.set('zoneId', zoneId);
    url.searchParams.set('metricKey', compareMetricKey);
    url.searchParams.set('rollup', '5m');
    return url.toString();
  }, [zoneId, compareMetricKey]);

  const summaryPdfUrl = useMemo(() => {
    const url = new URL(`${API_BASE_URL}/v1/reports/summary.pdf`);
    url.searchParams.set('zoneId', zoneId);
    return url.toString();
  }, [zoneId]);

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Reports</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <section style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Summary</div>
        <label>
          Zone:{' '}
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="zone-1">zone-1</option>
            <option value="zone-2">zone-2</option>
            <option value="zone-3">zone-3</option>
          </select>
        </label>
        {!data ? <p>Loading…</p> : null}
        {data ? (
          <>
            <p style={{ fontSize: 12, color: '#666' }}>
              Range: {data.from} → {data.to}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={th}>Metric</th>
                  <th style={th}>Avg</th>
                  <th style={th}>Min</th>
                  <th style={th}>Max</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, v]) => (
                  <tr key={k} style={{ borderTop: '1px solid #eee' }}>
                    <td style={td}>{k}</td>
                    <td style={td}>{v.avg.toFixed(3)}</td>
                    <td style={td}>{v.min.toFixed(3)}</td>
                    <td style={td}>{v.max.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Zone Comparison</div>
        <label>
          Metric:{' '}
          <select value={compareMetricKey} onChange={(e) => setCompareMetricKey(e.target.value)}>
            <option value="airTemp">airTemp</option>
            <option value="airRH">airRH</option>
            <option value="soil1">soil1</option>
            <option value="soil2">soil2</option>
            <option value="soil3">soil3</option>
            <option value="par">par</option>
            <option value="ec">ec</option>
            <option value="ph">ph</option>
          </select>
        </label>
        {!compare ? <p>Loading…</p> : null}
        {compare ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={th}>Zone</th>
                <th style={th}>Avg</th>
                <th style={th}>Min</th>
                <th style={th}>Max</th>
              </tr>
            </thead>
            <tbody>
              {compare.zones.map((z) => (
                <tr key={z.zoneId} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>
                    <a href={`/zones/${encodeURIComponent(z.zoneId)}`}>{z.zoneId}</a>
                  </td>
                  <td style={td}>{z.avg.toFixed(3)}</td>
                  <td style={td}>{z.min.toFixed(3)}</td>
                  <td style={td}>{z.max.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Sensor Health</div>
        {!health ? <p>Loading…</p> : null}
        {health ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={th}>Zone</th>
                <th style={th}>Device</th>
                <th style={th}>Online</th>
                <th style={th}>Last seen</th>
                <th style={th}>Last reading</th>
                <th style={th}>Points</th>
                <th style={th}>Metrics</th>
              </tr>
            </thead>
            <tbody>
              {health.devices.map((d) => (
                <tr key={d.deviceId} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{d.zoneId}</td>
                  <td style={td}>{d.name}</td>
                  <td style={td}>{d.online ? 'Yes' : 'No'}</td>
                  <td style={td}>{d.lastSeenAt ?? '—'}</td>
                  <td style={td}>{d.lastReadingAt ?? '—'}</td>
                  <td style={td}>{d.pointsInWindow}</td>
                  <td style={td}>{d.distinctMetricsInWindow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section style={{ border: '1px solid #eee', borderRadius: 10, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Export CSV</div>
        <p style={{ fontSize: 12, color: '#666' }}>Exports the selected zone + metric (rollup=5m, default range=24h).</p>
        <a href={exportUrl} style={{ display: 'inline-block' }}>
          Download CSV
        </a>
        <div style={{ height: 10 }} />
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Export PDF (optional)</div>
        <a href={summaryPdfUrl} style={{ display: 'inline-block' }}>
          Download Summary PDF
        </a>
      </section>
    </main>
  );
}

const th: React.CSSProperties = { fontSize: 12, color: '#666', padding: '8px 6px' };
const td: React.CSSProperties = { padding: '10px 6px', fontSize: 13, verticalAlign: 'top' };
