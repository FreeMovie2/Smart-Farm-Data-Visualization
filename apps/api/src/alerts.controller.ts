import { BadRequestException, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DbService } from './db.service';
import { clampInt } from './http.utils';

@Controller()
export class AlertsController {
  constructor(private readonly db: DbService) {}

  @Get('/v1/alerts')
  async list(
    @Query('farmId') farmId: string | undefined,
    @Query('zoneId') zoneId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('severity') severity: string | undefined,
    @Query('limit') limitRaw: string | undefined,
  ) {
    if (!farmId) throw new BadRequestException('Missing farmId');
    const limit = clampInt(limitRaw, 200, 1, 1000);

    const where: string[] = ['farm_id = $1'];
    const params: unknown[] = [farmId];

    if (zoneId) {
      params.push(zoneId);
      where.push(`zone_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (severity) {
      params.push(severity);
      where.push(`severity = $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT a.alert_id, a.farm_id, a.zone_id, a.device_id, a.alert_type, a.severity, a.status, a.message,
                a.started_at, a.acknowledged_at, a.resolved_at,
                d.name AS device_name
         FROM alerts a
         LEFT JOIN devices d ON d.device_id = a.device_id
         WHERE ${where.join(' AND ')}
         ORDER BY a.started_at DESC
         LIMIT ${limitParam}`,
        params,
      );

      return {
        farmId,
        alerts: result.rows.map((r) => ({
          alertId: r.alert_id,
          farmId: r.farm_id,
          zoneId: r.zone_id,
          deviceId: r.device_id,
          deviceName: r.device_name,
          type: r.alert_type,
          severity: r.severity,
          status: r.status,
          message: r.message,
          startedAt: (r.started_at as Date).toISOString(),
          acknowledgedAt: r.acknowledged_at ? (r.acknowledged_at as Date).toISOString() : null,
          resolvedAt: r.resolved_at ? (r.resolved_at as Date).toISOString() : null,
        })),
      };
    } finally {
      client.release();
    }
  }

  @Post('/v1/alerts/:alertId/ack')
  async acknowledge(@Param('alertId') alertIdRaw: string) {
    const alertId = Number.parseInt(alertIdRaw, 10);
    if (!Number.isFinite(alertId)) throw new BadRequestException('Invalid alertId');

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `UPDATE alerts
         SET status = 'acknowledged', acknowledged_at = now()
         WHERE alert_id = $1 AND status = 'active'
         RETURNING alert_id`,
        [alertId],
      );

      return { ok: true, updated: result.rowCount === 1 };
    } finally {
      client.release();
    }
  }
}

