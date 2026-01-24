import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DbService } from './db.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private readonly logger = new Logger(WorkerService.name);

  constructor(private readonly db: DbService) {}

  onModuleInit() {
    const intervalSeconds = Number(process.env.WORKER_INTERVAL_SEC ?? 60);
    this.logger.log(`Starting worker loop (interval=${intervalSeconds}s)`);

    void this.tick();
    setInterval(() => void this.tick(), intervalSeconds * 1000);
  }

  private async tick() {
    try {
      this.logger.log('Tick: evaluate alerts');
      const client = await this.db.pool.connect();
      try {
        await Promise.all([
          this.evaluateDeviceOffline(client),
          this.evaluateHumidityAndVpd(client),
          this.evaluateSoilMoisture(client),
          this.evaluateEcPh(client),
          this.evaluateSensorStuck(client),
        ]);
      } finally {
        client.release();
      }
    } catch (err) {
      this.logger.error('Worker tick failed', err as Error);
    }
  }

  private async evaluateDeviceOffline(client: PoolClient) {
    const offlineAfterMin = Number(process.env.OFFLINE_AFTER_MIN ?? 10);
    const devices = await client.query(
      `SELECT device_id, farm_id, zone_id, last_seen_at
       FROM devices`,
    );

    let created = 0;
    let resolved = 0;
    for (const d of devices.rows as Array<{ device_id: string; farm_id: string; zone_id: string; last_seen_at: Date | null }>) {
      const isOffline = !d.last_seen_at || Date.now() - d.last_seen_at.getTime() > offlineAfterMin * 60 * 1000;
      const action = await this.upsertAlert(client, {
        farmId: d.farm_id,
        zoneId: d.zone_id,
        deviceId: d.device_id,
        alertType: 'device_offline',
        severity: 'critical',
        message: isOffline ? `Device offline > ${offlineAfterMin} min` : 'Device online',
        shouldBeOpen: isOffline,
      });
      if (action === 'created') created++;
      if (action === 'resolved') resolved++;
    }
    this.logger.log(`Device offline: created=${created} resolved=${resolved}`);
  }

  private async evaluateHumidityAndVpd(client: PoolClient) {
    const rhThreshold = Number(process.env.ALERT_RH_THRESHOLD ?? 85);
    const rhWarnMin = Number(process.env.ALERT_RH_WARN_MIN ?? 5);
    const rhCritMin = Number(process.env.ALERT_RH_CRIT_MIN ?? 15);
    const vpdWindowMin = Number(process.env.ALERT_VPD_WINDOW_MIN ?? 10);
    const vpdMin = Number(process.env.ALERT_VPD_MIN ?? 0.35);
    const vpdMax = Number(process.env.ALERT_VPD_MAX ?? 1.6);

    const nowIso = new Date().toISOString();
    const rhWarnFromIso = new Date(Date.now() - rhWarnMin * 60 * 1000).toISOString();
    const rhCritFromIso = new Date(Date.now() - rhCritMin * 60 * 1000).toISOString();
    const vpdFromIso = new Date(Date.now() - vpdWindowMin * 60 * 1000).toISOString();

    const [rhWarnAgg, rhCritAgg, tempAgg] = await Promise.all([
      client.query(
        `SELECT zone_id, farm_id, device_id, avg(metric_value) AS avg_rh
         FROM sensor_readings
         WHERE metric_key = 'airRH' AND ts >= $1 AND ts <= $2
         GROUP BY zone_id, farm_id, device_id`,
        [rhWarnFromIso, nowIso],
      ),
      client.query(
        `SELECT zone_id, farm_id, device_id, avg(metric_value) AS avg_rh
         FROM sensor_readings
         WHERE metric_key = 'airRH' AND ts >= $1 AND ts <= $2
         GROUP BY zone_id, farm_id, device_id`,
        [rhCritFromIso, nowIso],
      ),
      client.query(
        `SELECT zone_id, farm_id, device_id,
                avg(CASE WHEN metric_key='airTemp' THEN metric_value END) AS avg_temp,
                avg(CASE WHEN metric_key='airRH' THEN metric_value END) AS avg_rh
         FROM sensor_readings
         WHERE metric_key IN ('airTemp','airRH') AND ts >= $1 AND ts <= $2
         GROUP BY zone_id, farm_id, device_id`,
        [vpdFromIso, nowIso],
      ),
    ]);

    const rhWarnByKey = new Map<string, { farmId: string; zoneId: string; deviceId: string; avgRh: number }>();
    for (const row of rhWarnAgg.rows as Array<{ zone_id: string; farm_id: string; device_id: string; avg_rh: string | null }>) {
      if (row.avg_rh === null) continue;
      const key = `${row.zone_id}::${row.device_id}`;
      rhWarnByKey.set(key, { farmId: row.farm_id, zoneId: row.zone_id, deviceId: row.device_id, avgRh: Number(row.avg_rh) });
    }

    const rhCritByKey = new Map<string, { avgRh: number }>();
    for (const row of rhCritAgg.rows as Array<{ zone_id: string; farm_id: string; device_id: string; avg_rh: string | null }>) {
      if (row.avg_rh === null) continue;
      const key = `${row.zone_id}::${row.device_id}`;
      rhCritByKey.set(key, { avgRh: Number(row.avg_rh) });
    }

    let created = 0;
    let resolved = 0;

    for (const [key, warn] of rhWarnByKey) {
      const crit = rhCritByKey.get(key);
      const shouldOpen = warn.avgRh > rhThreshold;
      const critical = !!crit && crit.avgRh > rhThreshold;

      const action = await this.upsertAlert(client, {
        farmId: warn.farmId,
        zoneId: warn.zoneId,
        deviceId: warn.deviceId,
        alertType: 'rh_high',
        severity: critical ? 'critical' : 'warning',
        message: critical
          ? `RH > ${rhThreshold}% for ${rhCritMin}m (avg: ${crit!.avgRh.toFixed(1)}%)`
          : `RH > ${rhThreshold}% for ${rhWarnMin}m (avg: ${warn.avgRh.toFixed(1)}%)`,
        shouldBeOpen: shouldOpen,
      });
      if (action === 'created') created++;
      if (action === 'resolved') resolved++;
    }

    for (const row of tempAgg.rows as Array<{ zone_id: string; farm_id: string; device_id: string; avg_temp: string | null; avg_rh: string | null }>) {
      if (row.avg_temp === null || row.avg_rh === null) continue;
      const vpd = this.computeVpdKpa(Number(row.avg_temp), Number(row.avg_rh));
      const outOfRange = vpd < vpdMin || vpd > vpdMax;

      const action = await this.upsertAlert(client, {
        farmId: row.farm_id,
        zoneId: row.zone_id,
        deviceId: row.device_id,
        alertType: 'vpd_out_of_range',
        severity: 'warning',
        message: `VPD out of range (avg ${vpdWindowMin}m): ${vpd.toFixed(3)} kPa`,
        shouldBeOpen: outOfRange,
      });
      if (action === 'created') created++;
      if (action === 'resolved') resolved++;
    }

    this.logger.log(`RH/VPD: created=${created} resolved=${resolved}`);
  }

  private async evaluateSoilMoisture(client: PoolClient) {
    const windowMin = Number(process.env.ALERT_SOIL_WINDOW_MIN ?? 10);
    const threshold = Number(process.env.ALERT_SOIL_LOW_THRESHOLD ?? 25);
    const nowIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();

    const result = await client.query(
      `SELECT zone_id, farm_id, device_id, avg(metric_value) AS avg_soil
       FROM sensor_readings
       WHERE metric_key IN ('soil1','soil2','soil3') AND ts >= $1 AND ts <= $2
       GROUP BY zone_id, farm_id, device_id`,
      [fromIso, nowIso],
    );

    let created = 0;
    let resolved = 0;
    for (const row of result.rows as Array<{ zone_id: string; farm_id: string; device_id: string; avg_soil: string | null }>) {
      if (row.avg_soil === null) continue;
      const avgSoil = Number(row.avg_soil);
      const low = avgSoil < threshold;
      const action = await this.upsertAlert(client, {
        farmId: row.farm_id,
        zoneId: row.zone_id,
        deviceId: row.device_id,
        alertType: 'soil_low',
        severity: 'warning',
        message: `Soil moisture low (avg ${windowMin}m): ${avgSoil.toFixed(2)} < ${threshold}`,
        shouldBeOpen: low,
      });
      if (action === 'created') created++;
      if (action === 'resolved') resolved++;
    }
    this.logger.log(`Soil: created=${created} resolved=${resolved}`);
  }

  private async evaluateEcPh(client: PoolClient) {
    const windowMin = Number(process.env.ALERT_EC_PH_WINDOW_MIN ?? 10);
    const ecMin = Number(process.env.ALERT_EC_MIN ?? 1.2);
    const ecMax = Number(process.env.ALERT_EC_MAX ?? 3.0);
    const phMin = Number(process.env.ALERT_PH_MIN ?? 5.5);
    const phMax = Number(process.env.ALERT_PH_MAX ?? 7.0);
    const nowIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();

    const result = await client.query(
      `SELECT zone_id, farm_id, device_id,
              avg(CASE WHEN metric_key='ec' THEN metric_value END) AS avg_ec,
              avg(CASE WHEN metric_key='ph' THEN metric_value END) AS avg_ph
       FROM sensor_readings
       WHERE metric_key IN ('ec','ph') AND ts >= $1 AND ts <= $2
       GROUP BY zone_id, farm_id, device_id`,
      [fromIso, nowIso],
    );

    let created = 0;
    let resolved = 0;
    for (const row of result.rows as Array<{ zone_id: string; farm_id: string; device_id: string; avg_ec: string | null; avg_ph: string | null }>) {
      if (row.avg_ec !== null) {
        const avgEc = Number(row.avg_ec);
        const out = avgEc < ecMin || avgEc > ecMax;
        const action = await this.upsertAlert(client, {
          farmId: row.farm_id,
          zoneId: row.zone_id,
          deviceId: row.device_id,
          alertType: 'ec_out_of_range',
          severity: 'warning',
          message: `EC out of range (avg ${windowMin}m): ${avgEc.toFixed(2)} (min=${ecMin}, max=${ecMax})`,
          shouldBeOpen: out,
        });
        if (action === 'created') created++;
        if (action === 'resolved') resolved++;
      }

      if (row.avg_ph !== null) {
        const avgPh = Number(row.avg_ph);
        const out = avgPh < phMin || avgPh > phMax;
        const action = await this.upsertAlert(client, {
          farmId: row.farm_id,
          zoneId: row.zone_id,
          deviceId: row.device_id,
          alertType: 'ph_out_of_range',
          severity: 'warning',
          message: `pH out of range (avg ${windowMin}m): ${avgPh.toFixed(2)} (min=${phMin}, max=${phMax})`,
          shouldBeOpen: out,
        });
        if (action === 'created') created++;
        if (action === 'resolved') resolved++;
      }
    }
    this.logger.log(`EC/pH: created=${created} resolved=${resolved}`);
  }

  private async evaluateSensorStuck(client: PoolClient) {
    const windowMin = Number(process.env.ALERT_STUCK_WINDOW_MIN ?? 20);
    const epsilon = Number(process.env.ALERT_STUCK_EPSILON ?? 0.001);
    const nowIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();

    const keys = ['airTemp', 'airRH', 'soil1', 'soil2', 'soil3', 'par', 'ec', 'ph', 'leafWet'];
    const result = await client.query(
      `SELECT zone_id, farm_id, device_id, metric_key,
              count(*)::int AS n,
              min(metric_value) AS min_v,
              max(metric_value) AS max_v
       FROM sensor_readings
       WHERE metric_key = ANY($1) AND ts >= $2 AND ts <= $3
       GROUP BY zone_id, farm_id, device_id, metric_key`,
      [keys, fromIso, nowIso],
    );

    let created = 0;
    let resolved = 0;
    for (const row of result.rows as Array<{
      zone_id: string;
      farm_id: string;
      device_id: string;
      metric_key: string;
      n: number;
      min_v: number;
      max_v: number;
    }>) {
      if (row.n < 3) continue;
      const stuck = Math.abs(row.max_v - row.min_v) <= epsilon;
      const action = await this.upsertAlert(client, {
        farmId: row.farm_id,
        zoneId: row.zone_id,
        deviceId: row.device_id,
        alertType: 'sensor_stuck',
        severity: 'warning',
        message: `Sensor stuck: ${row.metric_key} (range<=${epsilon} over ${windowMin}m)`,
        shouldBeOpen: stuck,
      });
      if (action === 'created') created++;
      if (action === 'resolved') resolved++;
    }
    this.logger.log(`Stuck: created=${created} resolved=${resolved}`);
  }

  private computeVpdKpa(airTempC: number, airRhPercent: number): number {
    const rh = Math.max(0, Math.min(100, airRhPercent));
    const svp = 0.6108 * Math.exp((17.27 * airTempC) / (airTempC + 237.3));
    return Math.max(0, (1 - rh / 100) * svp);
  }

  private async upsertAlert(
    client: PoolClient,
    input: {
    farmId: string;
    zoneId: string;
    deviceId?: string;
    alertType: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    shouldBeOpen: boolean;
  },
  ): Promise<'created' | 'updated' | 'resolved' | 'noop'> {
    await client.query('BEGIN');

    const existingParams: unknown[] = [input.farmId, input.zoneId, input.alertType];
    let existingWhere =
      "farm_id = $1 AND zone_id = $2 AND alert_type = $3 AND status IN ('active','acknowledged')";
    if (input.deviceId) {
      existingParams.push(input.deviceId);
      existingWhere += ` AND device_id = $${existingParams.length}`;
    } else {
      existingWhere += ' AND device_id IS NULL';
    }

    const existing = await client.query(
      `SELECT alert_id, status
       FROM alerts
       WHERE ${existingWhere}
       ORDER BY started_at DESC
       LIMIT 1`,
      existingParams,
    );

    if (input.shouldBeOpen) {
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO alerts (farm_id, zone_id, device_id, alert_type, severity, status, message, started_at)
           VALUES ($1, $2, $3, $4, $5, 'active', $6, now())`,
          [input.farmId, input.zoneId, input.deviceId ?? null, input.alertType, input.severity, input.message],
        );
        await client.query('COMMIT');
        return 'created';
      }

      const alertId = (existing.rows[0] as { alert_id: number }).alert_id;
      await client.query(
        `UPDATE alerts
         SET severity = $2, message = $3
         WHERE alert_id = $1`,
        [alertId, input.severity, input.message],
      );
      await client.query('COMMIT');
      return 'updated';
    }

    if (existing.rowCount === 1) {
      const alertId = (existing.rows[0] as { alert_id: number }).alert_id;
      await client.query(
        `UPDATE alerts
         SET status = 'resolved', resolved_at = now()
         WHERE alert_id = $1`,
        [alertId],
      );
      await client.query('COMMIT');
      return 'resolved';
    }

    await client.query('COMMIT');
    return 'noop';
  }
}
