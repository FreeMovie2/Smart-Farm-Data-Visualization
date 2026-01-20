'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';
import { DEFAULT_FARM_ID } from '../../lib/config';
import { getStoredRole } from '../../lib/role';

type EventsResponse = {
  events: Array<{ eventId: number; zoneId: string; eventType: string; title: string; ts: string; createdBy?: string }>;
};

export default function EventsPage() {
  const [data, setData] = useState<EventsResponse | null>(null);
  const [zoneId, setZoneId] = useState('zone-1');
  const [eventType, setEventType] = useState('Irrigation');
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'operator' | 'admin'>('operator');

  const load = async () => {
    try {
      setError(null);
      setData(await apiGet<EventsResponse>(`/v1/events?farmId=${encodeURIComponent(DEFAULT_FARM_ID)}`));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => void load(), []);
  useEffect(() => setRole(getStoredRole()), []);

  const create = async () => {
    try {
      setError(null);
      await apiPost('/v1/events', {
        farmId: DEFAULT_FARM_ID,
        zoneId,
        eventType,
        title,
        ts: new Date().toISOString(),
        createdBy: 'admin',
      });
      setTitle('');
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main>
      <h1 className="page-title">Events</h1>
      {error ? <p className="error">{error}</p> : null}

      <section className="card" style={{ padding: 10, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Create (admin only)</div>
          <div className="muted" style={{ fontSize: 11 }}>
            Role: <span style={{ fontFamily: 'var(--mono)' }}>{role}</span>
          </div>
        </div>

        {role !== 'admin' ? (
          <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>
            Read-only for this role. Switch role to Admin to create events.
          </p>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: '160px 200px 1fr auto', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <label className="muted" style={{ fontSize: 12 }}>
            Zone
            <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              <option value="zone-1">zone-1</option>
              <option value="zone-2">zone-2</option>
              <option value="zone-3">zone-3</option>
            </select>
          </label>

          <label className="muted" style={{ fontSize: 12 }}>
            Type
            <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ width: '100%', marginTop: 4 }}>
              <option value="Irrigation">Irrigation</option>
              <option value="Fertigation">Fertigation</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Crop">Crop activity</option>
              <option value="System">System</option>
            </select>
          </label>

          <label className="muted" style={{ fontSize: 12 }}>
            Title
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Irrigation" style={{ width: '100%', marginTop: 4 }} />
          </label>

          <button className="btn btn-primary" onClick={() => void create()} disabled={role !== 'admin' || !title.trim()}>
            Create
          </button>
        </div>
      </section>

      {!data ? <p className="muted">Loading...</p> : null}

      {data ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Zone</th>
                <th>Type</th>
                <th>Title</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((e) => (
                <tr key={e.eventId}>
                  <td>{e.ts}</td>
                  <td>
                    <a className="link" href={`/zones/${encodeURIComponent(e.zoneId)}`}> {e.zoneId}</a>
                  </td>
                  <td>{e.eventType}</td>
                  <td>{e.title}</td>
                  <td>{e.createdBy ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
