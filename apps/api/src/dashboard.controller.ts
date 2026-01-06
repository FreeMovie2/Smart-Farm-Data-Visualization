import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DbService } from './db.service';
import { computeVpdKpa, round } from './metrics.utils';
import { clampInt } from './http.utils';

type ZoneSummary = {
  zoneId: string;
  deviceId?: string;
  lastUpdatedAt?: string;
  kpis: {
    airTemp?: number;
    airRH?: number;
    vpd?: number;
    soilAvg?: number;
    par?: number;
    ec?: number;
    ph?: number;
  };
  activeAlerts: number;
  device: {
    name?: string;
    lastSeenAt?: string | null;
    online: boolean;
  };
};

@Controller()
export class DashboardController {
  constructor(private readonly db: DbService) {}

  @Get('/v1/dashboard')
  async dashboard(@Query('farmId') farmId: string | undefined, @Query('offlineAfterMin') offlineAfterMinRaw: string | undefined) {
    if (!farmId) throw new BadRequestException('Missing farmId');
    const offlineAfterMin = clampInt(offlineAfterMinRaw, 10, 1, 24 * 60);

    const client = await this.db.pool.connect();
    try {
      const [latestMetrics, devices, activeAlerts] = await Promise.all([
        client.query(
          `SELECT DISTINCT ON (zone_id, metric_key)
             zone_id, device_id, metric_key, metric_value, ts
           FROM sensor_readings
           WHERE farm_id = $1
           ORDER BY zone_id, metric_key, ts DESC`,
          [farmId],
        ),
        client.query(`SELECT zone_id, device_id, name, last_seen_at FROM devices WHERE farm_id = $1`, [farmId]),
        client.query(`SELECT zone_id, count(*)::int AS n FROM alerts WHERE farm_id = $1 AND status = 'active' GROUP BY zone_id`, [farmId]),
      ]);

      const now = Date.now();
      const offlineAfterMs = offlineAfterMin * 60 * 1000;

      const zoneSummaries = new Map<string, ZoneSummary>();

      for (const row of devices.rows as Array<{ zone_id: string; device_id: string; name: string; last_seen_at: Date | null }>) {
        const lastSeenAt = row.last_seen_at?.toISOString() ?? null;
        const online = row.last_seen_at ? now - row.last_seen_at.getTime() <= offlineAfterMs : false;
        zoneSummaries.set(row.zone_id, {
          zoneId: row.zone_id,
          deviceId: row.device_id,
          kpis: {},
          activeAlerts: 0,
          device: { name: row.name, lastSeenAt, online },
        });
      }

      for (const row of activeAlerts.rows as Array<{ zone_id: string; n: number }>) {
        const zone = zoneSummaries.get(row.zone_id);
        if (zone) zone.activeAlerts = row.n;
      }

      for (const row of latestMetrics.rows as Array<{
        zone_id: string;
        device_id: string;
        metric_key: string;
        metric_value: number;
        ts: Date;
      }>) {
        const zone = zoneSummaries.get(row.zone_id) ?? {
          zoneId: row.zone_id,
          deviceId: row.device_id,
          kpis: {},
          activeAlerts: 0,
          device: { online: false, lastSeenAt: null },
        };

        zone.deviceId ??= row.device_id;
        const ts = row.ts.toISOString();
        if (!zone.lastUpdatedAt || ts > zone.lastUpdatedAt) zone.lastUpdatedAt = ts;

        if (row.metric_key === 'airTemp') zone.kpis.airTemp = row.metric_value;
        if (row.metric_key === 'airRH') zone.kpis.airRH = row.metric_value;
        if (row.metric_key === 'par') zone.kpis.par = row.metric_value;
        if (row.metric_key === 'ec') zone.kpis.ec = row.metric_value;
        if (row.metric_key === 'ph') zone.kpis.ph = row.metric_value;

        const soilKeys = new Set(['soil1', 'soil2', 'soil3']);
        if (soilKeys.has(row.metric_key)) {
          // compute after collecting all keys; stash in kpis temporarily
          (zone.kpis as Record<string, number>)[row.metric_key] = row.metric_value;
        }

        zoneSummaries.set(row.zone_id, zone);
      }

      for (const zone of zoneSummaries.values()) {
        const soilValues = ['soil1', 'soil2', 'soil3']
          .map((k) => (zone.kpis as Record<string, unknown>)[k])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        if (soilValues.length > 0) {
          zone.kpis.soilAvg = round(soilValues.reduce((a, b) => a + b, 0) / soilValues.length, 2);
        }

        const t = zone.kpis.airTemp;
        const rh = zone.kpis.airRH;
        if (typeof t === 'number' && typeof rh === 'number') {
          zone.kpis.vpd = round(computeVpdKpa(t, rh), 3);
        }

        delete (zone.kpis as Record<string, unknown>).soil1;
        delete (zone.kpis as Record<string, unknown>).soil2;
        delete (zone.kpis as Record<string, unknown>).soil3;
      }

      return {
        farmId,
        offlineAfterMin,
        zones: Array.from(zoneSummaries.values()).sort((a, b) => a.zoneId.localeCompare(b.zoneId)),
      };
    } finally {
      client.release();
    }
  }
}

