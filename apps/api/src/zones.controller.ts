import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { DbService } from './db.service';
import { clampInt, parseOptionalIsoDate, pickRollup } from './http.utils';

@Controller()
export class ZonesController {
  constructor(private readonly db: DbService) {}

  @Get('/v1/zones/:zoneId/latest')
  async latest(@Param('zoneId') zoneId: string) {
    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT DISTINCT ON (metric_key)
           metric_key, metric_value, ts
         FROM sensor_readings
         WHERE zone_id = $1
         ORDER BY metric_key, ts DESC`,
        [zoneId],
      );

      const metrics: Record<string, number> = {};
      let lastUpdatedAt: string | undefined;
      for (const row of result.rows as Array<{ metric_key: string; metric_value: number; ts: Date }>) {
        metrics[row.metric_key] = row.metric_value;
        const ts = row.ts.toISOString();
        if (!lastUpdatedAt || ts > lastUpdatedAt) lastUpdatedAt = ts;
      }

      return { zoneId, lastUpdatedAt, metrics };
    } finally {
      client.release();
    }
  }

  @Get('/v1/zones/:zoneId/series')
  async series(
    @Param('zoneId') zoneId: string,
    @Query('metricKey') metricKey: string | undefined,
    @Query('from') fromRaw: string | undefined,
    @Query('to') toRaw: string | undefined,
    @Query('rollup') rollupRaw: string | undefined,
    @Query('limit') limitRaw: string | undefined,
  ) {
    if (!metricKey) throw new BadRequestException('Missing metricKey');

    const rollup = pickRollup(rollupRaw);
    const limit = clampInt(limitRaw, 2000, 1, 10000);

    const to = parseOptionalIsoDate(toRaw) ?? new Date();
    const from = parseOptionalIsoDate(fromRaw) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be <= to');

    const client = await this.db.pool.connect();
    try {
      if (rollup === 'raw') {
        const result = await client.query(
          `SELECT ts, metric_value AS value
           FROM sensor_readings
           WHERE zone_id = $1 AND metric_key = $2 AND ts >= $3 AND ts <= $4
           ORDER BY ts
           LIMIT $5`,
          [zoneId, metricKey, from.toISOString(), to.toISOString(), limit],
        );

        return {
          zoneId,
          metricKey,
          rollup,
          from: from.toISOString(),
          to: to.toISOString(),
          points: (result.rows as Array<{ ts: Date; value: number }>).map((r) => ({ ts: r.ts.toISOString(), value: r.value })),
        };
      }

      const bucket = rollup === '5m' ? '5 minutes' : '1 hour';
      const result = await client.query(
        `SELECT time_bucket('${bucket}', ts) AS ts, avg(metric_value) AS value
         FROM sensor_readings
         WHERE zone_id = $1 AND metric_key = $2 AND ts >= $3 AND ts <= $4
         GROUP BY 1
         ORDER BY 1
         LIMIT $5`,
        [zoneId, metricKey, from.toISOString(), to.toISOString(), limit],
      );

      return {
        zoneId,
        metricKey,
        rollup,
        from: from.toISOString(),
        to: to.toISOString(),
        points: (result.rows as Array<{ ts: Date; value: string | number | null }>).map((r) => ({
          ts: r.ts.toISOString(),
          value: r.value === null ? null : Number(r.value),
        })),
      };
    } finally {
      client.release();
    }
  }
}

