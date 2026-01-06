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
      <h1 style={{ marginTop: 0 }}>Events</h1>
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      <section style={{ border: '1px solid #eee', borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Create (admin only)</div>
        {role !== 'admin' ? (
          <p style={{ marginTop: 0, fontSize: 12, color: '#666' }}>Read-only for role: {role}. Switch role to Admin to create events.</p>
        ) : null}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>
            Zone:{' '}
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              <option value="zone-1">zone-1</option>
              <option value="zone-2">zone-2</option>
              <option value="zone-3">zone-3</option>
            </select>
          </label>
          <label>
            Type:{' '}
            <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="Irrigation">Irrigation</option>
              <option value="Fertigation">Fertigation</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Crop">Crop activity</option>
              <option value="System">System</option>
            </select>
          </label>
          <label>
            Title:{' '}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Irrigation" />
          </label>
          <button onClick={() => void create()} disabled={role !== 'admin' || !title.trim()} style={{ cursor: 'pointer' }}>
            Create
          </button>
        </div>
      </section>

      {!data ? <p>Loading…</p> : null}
      {data ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={th}>Time</th>
              <th style={th}>Zone</th>
              <th style={th}>Type</th>
              <th style={th}>Title</th>
              <th style={th}>By</th>
            </tr>
          </thead>
          <tbody>
            {data.events.map((e) => (
              <tr key={e.eventId} style={{ borderTop: '1px solid #eee' }}>
                <td style={td}>{e.ts}</td>
                <td style={td}>
                  <a href={`/zones/${encodeURIComponent(e.zoneId)}`}>{e.zoneId}</a>
                </td>
                <td style={td}>{e.eventType}</td>
                <td style={td}>{e.title}</td>
                <td style={td}>{e.createdBy ?? '—'}</td>
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
