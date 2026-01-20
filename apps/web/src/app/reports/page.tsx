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

  const summaryRows = useMemo(() => {
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
      <h1 className="page-title">Reports</h1>
      {error ? <p className="error">{error}</p> : null}

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 10 }}>
        <section className="card" style={{ padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Summary</div>
            <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              Zone
              <select className="input input--compact" value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="zone-1">zone-1</option>
                <option value="zone-2">zone-2</option>
                <option value="zone-3">zone-3</option>
              </select>
            </label>
          </div>

          {!data ? <p className="muted" style={{ margin: '8px 0 0' }}>Loading...</p> : null}

          {data ? (
            <>
              <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
                Range: <span style={{ fontFamily: 'var(--mono)' }}>{data.from}</span> - <span style={{ fontFamily: 'var(--mono)' }}>{data.to}</span>
              </div>
              <div className="table-wrap" style={{ marginTop: 8 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Avg</th>
                      <th>Min</th>
                      <th>Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map(([k, v]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        <td>{v.avg.toFixed(3)}</td>
                        <td>{v.min.toFixed(3)}</td>
                        <td>{v.max.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>

        <section className="card" style={{ padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Zone Comparison</div>
            <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              Metric
              <select className="input input--compact" value={compareMetricKey} onChange={(e) => setCompareMetricKey(e.target.value)}>
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
          </div>

          {!compare ? <p className="muted" style={{ margin: '8px 0 0' }}>Loading...</p> : null}

          {compare ? (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Avg</th>
                    <th>Min</th>
                    <th>Max</th>
                  </tr>
                </thead>
                <tbody>
                  {compare.zones.map((z) => (
                    <tr key={z.zoneId}>
                      <td>
                        <a className="link" href={`/zones/${encodeURIComponent(z.zoneId)}`}> {z.zoneId}</a>
                      </td>
                      <td>{z.avg.toFixed(3)}</td>
                      <td>{z.min.toFixed(3)}</td>
                      <td>{z.max.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="card" style={{ padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Sensor Health</div>
            <div className="muted" style={{ fontSize: 11 }}>
              Table view
            </div>
          </div>

          {!health ? <p className="muted" style={{ margin: '8px 0 0' }}>Loading...</p> : null}

          {health ? (
            <div className="table-wrap" style={{ marginTop: 8 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Zone</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Last seen</th>
                    <th>Last reading</th>
                    <th>Points</th>
                    <th>Metrics</th>
                  </tr>
                </thead>
                <tbody>
                  {health.devices.map((d) => (
                    <tr key={d.deviceId}>
                      <td>{d.zoneId}</td>
                      <td>{d.name}</td>
                      <td>
                        <span className="badge">
                          <span className={d.online ? 'dot dot-ok' : 'dot dot-bad'} />
                          {d.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td>{d.lastSeenAt ?? 'N/A'}</td>
                      <td>{d.lastReadingAt ?? 'N/A'}</td>
                      <td>{d.pointsInWindow}</td>
                      <td>{d.distinctMetricsInWindow}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="card" style={{ padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Exports</div>
            <div className="muted" style={{ fontSize: 11 }}>
              CSV + PDF
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
            <a className="btn btn-primary" href={exportUrl}>
              Download CSV
            </a>
            <a className="btn" href={summaryPdfUrl}>
              Download Summary PDF
            </a>
          </div>

          <div className="muted" style={{ marginTop: 8, fontSize: 11 }}>
            CSV exports selected zone + metric (rollup=5m, default range=24h).
          </div>
        </section>
      </div>
    </main>
  );
}
