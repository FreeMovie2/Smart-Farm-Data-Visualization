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
      <h1 style={{ marginTop: 0 }}>Zone: {zoneId}</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <label style={{ fontSize: 14 }}>
          Metric:{' '}
          <select value={metricKey} onChange={(e) => setMetricKey(e.target.value)}>
            {availableMetricKeys.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <a href="/dashboard" style={{ fontSize: 14 }}>
          ← Back
        </a>
      </div>

      {series ? <LineChart title={`${metricKey} (rollup 5m)`} points={series.points} /> : <p>Loading chart…</p>}

      <h2 style={{ marginTop: 16 }}>Latest</h2>
      {latest ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {Object.entries(latest.metrics)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => (
              <div key={k} style={{ border: '1px solid #eee', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, color: '#666' }}>{k}</div>
                <div style={{ fontWeight: 700 }}>{v.toFixed(3)}</div>
              </div>
            ))}
        </div>
      ) : (
        <p>Loading…</p>
      )}
    </main>
  );
}
