'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/api';
import { DEFAULT_FARM_ID } from '../../lib/config';
import { usePolling } from '../../lib/polling';

type DevicesResponse = {
  devices: Array<{ deviceId: string; zoneId: string; name: string; lastSeenAt: string | null; online: boolean }>;
};

export default function DevicesPage() {
  const [data, setData] = useState<DevicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');

  const load = async () => {
    try {
      setError(null);
      setData(await apiGet<DevicesResponse>(`/v1/devices?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  usePolling(() => void load(), 10_000);
  useEffect(() => void load(), []);

  const rows = (data?.devices ?? []).filter((d) => {
    const q = queryText.trim().toLowerCase();
    if (!q) return true;
    return `${d.zoneId} ${d.deviceId} ${d.name}`.toLowerCase().includes(q);
  });

  return (
    <main>
      <h1 className="page-title">Devices</h1>
      {error ? <p className="error">{error}</p> : null}
      {!data ? <p className="muted">Loading...</p> : null}

      {data ? (
        <>
          <section className="card" style={{ padding: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {rows.length} devices
              </div>
              <input
                className="input input--compact"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Filter (zone, name)"
              />
            </div>
          </section>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.deviceId}>
                    <td>
                      <a className="link" href={`/zones/${encodeURIComponent(d.zoneId)}`}>
                        {' '}
                        {d.zoneId}
                      </a>
                    </td>
                    <td>{d.name}</td>
                    <td>
                      <span className="badge">
                        <span className={d.online ? 'dot dot-ok' : 'dot dot-bad'} />
                        {d.online ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td>{d.lastSeenAt ?? 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </main>
  );
}
