'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import { DEFAULT_FARM_ID } from '../../lib/config';
import { usePolling } from '../../lib/polling';

type AlertsResponse = {
  alerts: Array<{
    alertId: number;
    zoneId: string;
    type: string;
    severity: string;
    status: string;
    message: string;
    startedAt: string;
  }>;
};

export default function AlertsPage() {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setData(await apiGet<AlertsResponse>(`/v1/alerts?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  usePolling(() => void load(), 10_000);
  useEffect(() => void load(), []);

  const ack = async (alertId: number) => {
    try {
      await apiPost(`/v1/alerts/${alertId}/ack`, {});
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Alerts</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {!data ? <p>Loading…</p> : null}
      {data ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={th}>ID</th>
              <th style={th}>Zone</th>
              <th style={th}>Type</th>
              <th style={th}>Severity</th>
              <th style={th}>Status</th>
              <th style={th}>Message</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {data.alerts.map((a) => (
              <tr key={a.alertId} style={{ borderTop: '1px solid #eee' }}>
                <td style={td}>{a.alertId}</td>
                <td style={td}>
                  <a href={`/zones/${encodeURIComponent(a.zoneId)}`}>{a.zoneId}</a>
                </td>
                <td style={td}>{a.type}</td>
                <td style={td}>{a.severity}</td>
                <td style={td}>{a.status}</td>
                <td style={td}>{a.message}</td>
                <td style={td}>
                  {a.status === 'active' ? (
                    <button onClick={() => void ack(a.alertId)} style={{ cursor: 'pointer' }}>
                      Ack
                    </button>
                  ) : null}
                </td>
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

