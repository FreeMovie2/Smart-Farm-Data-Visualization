'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../../lib/api';
import { LineChart } from '../../../components/LineChart';
import { usePolling } from '../../../lib/polling';

type LatestResponse = { zoneId: string; lastUpdatedAt?: string; metrics: Record<string, number> };
type SeriesResponse = { points: Array<{ ts: string; value: number | null }> };

export default function ZoneDetailPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const [latest, setLatest] = useState<LatestResponse | null>(null);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [metricKey, setMetricKey] = useState<string>('airTemp');
  const [error, setError] = useState<string | null>(null);

  const availableMetricKeys = useMemo(() => {
    if (!latest) return ['airTemp', 'airRH', 'soil1', 'soil2', 'soil3', 'par', 'ec', 'ph'];
    return Object.keys(latest.metrics).sort();
  }, [latest]);

  const load = async () => {
    try {
      setError(null);
      const [l, s] = await Promise.all([
        apiGet<LatestResponse>(`/v1/zones/${encodeURIComponent(zoneId)}/latest`),
        apiGet<SeriesResponse>(
          `/v1/zones/${encodeURIComponent(zoneId)}/series?metricKey=${encodeURIComponent(metricKey)}&rollup=5m`,
        ),
      ]);
      setLatest(l);
      setSeries(s);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  usePolling(() => void load(), 15_000);
  useEffect(() => void load(), [zoneId, metricKey]);

  return (
    <main>
      <h1 className="page-title">Zone: {zoneId}</h1>
      {error ? <p className="error">{error}</p> : null}

      <section className="card" style={{ padding: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            Metric
            <select className="input input--compact" value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
              {availableMetricKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <a className="link" href="/dashboard">
            Back
          </a>
        </div>

        <div style={{ marginTop: 8 }}>
          {series ? <LineChart title={`${metricKey} (rollup 5m)`} points={series.points} /> : <p className="muted">Loading chart...</p>}
        </div>
      </section>

      <section className="card" style={{ padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Latest</div>
          <div className="muted" style={{ fontSize: 11 }}>
            {latest?.lastUpdatedAt ? `Last update: ${latest.lastUpdatedAt}` : ''}
          </div>
        </div>

        {!latest ? <p className="muted" style={{ margin: '8px 0 0' }}>Loading...</p> : null}

        {latest ? (
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 10 }}>
            {Object.entries(latest.metrics)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, v]) => (
                <div key={k} className="metric">
                  <div className="metric-label">
                    <span>{k}</span>
                    <span className="dot" style={{ width: 6, height: 6, background: 'rgba(19,23,20,0.28)' }} />
                  </div>
                  <div className="metric-value">{v.toFixed(3)}</div>
                </div>
              ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
