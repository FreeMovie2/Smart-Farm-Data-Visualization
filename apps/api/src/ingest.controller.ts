import { BadRequestException, Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { IngestDto } from './ingest.dto';
import { DbService } from './db.service';

@Controller()
export class IngestController {
  constructor(private readonly db: DbService) {}

  @Post('/v1/ingest')
  async ingest(@Headers('x-device-key') deviceKey: string | undefined, @Body() body: IngestDto) {
    if (!deviceKey) {
      throw new BadRequestException('Missing X-Device-Key');
    }

    const tsDate = new Date(body.ts);
    if (Number.isNaN(tsDate.getTime())) {
      throw new BadRequestException('Invalid ts');
    }

    if (!body.metrics || typeof body.metrics !== 'object') {
      throw new BadRequestException('Invalid metrics');
    }

    for (const [metricKey, metricValue] of Object.entries(body.metrics)) {
      if (!metricKey || typeof metricKey !== 'string') {
        throw new BadRequestException('Invalid metric key');
      }
      if (typeof metricValue !== 'number' || !Number.isFinite(metricValue)) {
        throw new BadRequestException(`Invalid metric value for ${metricKey}`);
      }
    }

    const client = await this.db.pool.connect();
    try {
      await client.query('BEGIN');

      const deviceResult = await client.query(
        `SELECT device_id, farm_id, zone_id
         FROM devices
         WHERE device_key = $1`,
        [deviceKey],
      );

      if (deviceResult.rowCount !== 1) {
        throw new UnauthorizedException('Invalid X-Device-Key');
      }

      const device = deviceResult.rows[0] as { device_id: string; farm_id: string; zone_id: string };
      if (device.device_id !== body.deviceId || device.farm_id !== body.farmId || device.zone_id !== body.zoneId) {
        throw new UnauthorizedException('Device identity mismatch');
      }

      const rows = Object.entries(body.metrics).map(([metricKey, metricValue]) => ({
        metricKey,
        metricValue,
      }));

      for (const row of rows) {
        await client.query(
          `INSERT INTO sensor_readings (ts, farm_id, zone_id, device_id, metric_key, metric_value)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (ts, device_id, metric_key) DO UPDATE
             SET metric_value = EXCLUDED.metric_value`,
          [tsDate.toISOString(), body.farmId, body.zoneId, body.deviceId, row.metricKey, row.metricValue],
        );
      }

      await client.query(`UPDATE devices SET last_seen_at = $1 WHERE device_id = $2`, [tsDate.toISOString(), body.deviceId]);

      await client.query('COMMIT');
      return { ok: true };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }
}
