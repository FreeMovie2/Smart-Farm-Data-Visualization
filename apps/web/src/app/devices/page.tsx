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

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Devices</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {!data ? <p>Loading…</p> : null}
      {data ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={th}>Zone</th>
              <th style={th}>Device</th>
              <th style={th}>Online</th>
              <th style={th}>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {data.devices.map((d) => (
              <tr key={d.deviceId} style={{ borderTop: '1px solid #eee' }}>
                <td style={td}>
                  <a href={`/zones/${encodeURIComponent(d.zoneId)}`}>{d.zoneId}</a>
                </td>
                <td style={td}>{d.name}</td>
                <td style={td}>{d.online ? 'Yes' : 'No'}</td>
                <td style={td}>{d.lastSeenAt ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </main>
  );
}

const th: React.CSSProperties = { fontSize: 12, color: '#666', padding: '8px 6px' };
const td: React.CSSProperties = { padding: '10px 6px', fontSize: 13, verticalAlign: 'top' };

