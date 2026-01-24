'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import { DEFAULT_FARM_ID } from '../../lib/config';
import { usePolling } from '../../lib/polling';

type AlertsResponse = {
  alerts: Array<{
    alertId: number;
    zoneId: string;
    deviceId: string | null;
    deviceName?: string | null;
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
  const [queryText, setQueryText] = useState('');

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

  const rows = useMemo(() => {
    const all = data?.alerts ?? [];
    const q = queryText.trim().toLowerCase();
    if (!q) return all;
    return all.filter((a) => {
      const deviceLabel = a.deviceName ?? a.deviceId ?? '';
      const hay = `${deviceLabel} ${a.zoneId} ${a.type} ${a.severity} ${a.status} ${a.message}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, queryText]);

  return (
    <main>
      <h1 className="page-title">Alerts</h1>
      {error ? <p className="error">{error}</p> : null}
      {!data ? <p className="muted">Loading...</p> : null}

      {data ? (
        <>
          <section className="card" style={{ padding: 10, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>
                {rows.length} alerts
              </div>
              <input
                className="input input--compact"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Filter (zone, type, message)"
              />
            </div>
          </section>

          <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Device</th>
                <th>Zone</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Message</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.alertId}>
                  <td>{a.alertId}</td>
                  <td>
                    <span>{a.deviceName ?? a.deviceId ?? 'N/A'}</span>
                  </td>
                  <td>
                    <a className="link" href={`/zones/${encodeURIComponent(a.zoneId)}`}> {a.zoneId}</a>
                  </td>
                  <td>{formatAlertType(a.type)}</td>
                  <td>
                    <span className={`badge ${severityClass(a.severity)}`}>{a.severity}</span>
                  </td>
                  <td>{a.status}</td>
                  <td>{a.message}</td>
                  <td>
                    {a.status === 'active' ? (
                      <button className="btn btn-primary" onClick={() => void ack(a.alertId)}>
                        Ack
                      </button>
                    ) : null}
                  </td>
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

function severityClass(severity: string) {
  const key = severity.toLowerCase();
  if (key.includes('critical')) return 'badge-critical';
  if (key.includes('warn')) return 'badge-warn';
  return 'badge-info';
}

function formatAlertType(type: string) {
  const key = type.toLowerCase();
  const readable: Record<string, string> = {
    device_offline: 'Device Offline',
    rh_high: 'High Humidity',
    vpd_out_of_range: 'VPD Out of Range',
    soil_low: 'Soil Moisture Low',
    ec_out_of_range: 'EC Out of Range',
    ph_out_of_range: 'pH Out of Range',
    sensor_stuck: 'Sensor Stuck',
  };
  return readable[key] ?? type.replace(/_/g, ' ');
}
