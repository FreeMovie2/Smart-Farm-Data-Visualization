'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../../lib/api';
import { LineChart } from '../../../components/LineChart';
import { usePolling } from '../../../lib/polling';

type LatestResponse = { zoneId: string; lastUpdatedAt?: string; metrics: Record<string, number> };
type SeriesResponse = { points: Array<{ ts: string; value: number | null }> };
type RangePreset = '24h' | '7d' | '30d';
type Rollup = '5m' | '1h' | 'raw';

export default function ZoneDetailPage({ params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = use(params);
  const [latest, setLatest] = useState<LatestResponse | null>(null);
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [metricKey, setMetricKey] = useState<string>('airTemp');
  const [range, setRange] = useState<RangePreset>('24h');
  const [rollup, setRollup] = useState<Rollup>('5m');
  const [error, setError] = useState<string | null>(null);

  const availableMetricKeys = useMemo(() => {
    if (!latest) return ['airTemp', 'airRH', 'soil1', 'soil2', 'soil3', 'par', 'ec', 'ph'];
    return Object.keys(latest.metrics).sort();
  }, [latest]);

  useEffect(() => {
    if (range === '24h') setRollup('5m');
    if (range === '7d') setRollup('1h');
    if (range === '30d') setRollup('1h');
  }, [range]);

  const load = async () => {
    try {
      setError(null);
      const to = new Date();
      const from =
        range === '24h'
          ? new Date(to.getTime() - 24 * 60 * 60 * 1000)
          : range === '7d'
            ? new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000)
            : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      const [l, s] = await Promise.all([
        apiGet<LatestResponse>(`/v1/zones/${encodeURIComponent(zoneId)}/latest`),
        apiGet<SeriesResponse>(
          `/v1/zones/${encodeURIComponent(zoneId)}/series?metricKey=${encodeURIComponent(metricKey)}&rollup=${encodeURIComponent(rollup)}&from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        ),
      ]);
      setLatest(l);
      setSeries(s);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  usePolling(() => void load(), 15_000);
  useEffect(() => void load(), [zoneId, metricKey, range, rollup]);

  return (
    <main>
      <h1 className="page-title">Zone: {zoneId}</h1>
      {error ? <p className="error">{error}</p> : null}

      <section className="card" style={{ padding: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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

            <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              Range
              <select className="input input--compact" value={range} onChange={(e) => setRange(e.target.value as RangePreset)}>
                <option value="24h">24h</option>
                <option value="7d">7d</option>
                <option value="30d">30d</option>
              </select>
            </label>

            <label className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              Rollup
              <select className="input input--compact" value={rollup} onChange={(e) => setRollup(e.target.value as Rollup)}>
                <option value="5m">5m</option>
                <option value="1h">1h</option>
                <option value="raw">raw</option>
              </select>
            </label>
          </div>
          <a className="link" href="/dashboard">
            Back
          </a>
        </div>

        <div style={{ marginTop: 8 }}>
          {series ? <LineChart title={`${metricKey} (${range}, ${rollup})`} points={series.points} /> : <p className="muted">Loading chart...</p>}
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
