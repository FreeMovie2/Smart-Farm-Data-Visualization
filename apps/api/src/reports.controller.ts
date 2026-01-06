import { BadRequestException, Controller, Get, Header, Query, Res } from '@nestjs/common';
import { DbService } from './db.service';
import type { Response } from 'express';
import PDFDocument = require('pdfkit');
import { clampInt, parseOptionalIsoDate, pickRollup } from './http.utils';

@Controller()
export class ReportsController {
  constructor(private readonly db: DbService) {}

  @Get('/v1/reports/summary')
  async summary(
    @Query('zoneId') zoneId: string | undefined,
    @Query('from') fromRaw: string | undefined,
    @Query('to') toRaw: string | undefined,
  ) {
    if (!zoneId) throw new BadRequestException('Missing zoneId');

    const to = parseOptionalIsoDate(toRaw) ?? new Date();
    const from = parseOptionalIsoDate(fromRaw) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be <= to');

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT metric_key,
                avg(metric_value) AS avg_value,
                min(metric_value) AS min_value,
                max(metric_value) AS max_value
         FROM sensor_readings
         WHERE zone_id = $1 AND ts >= $2 AND ts <= $3
         GROUP BY metric_key
         ORDER BY metric_key`,
        [zoneId, from.toISOString(), to.toISOString()],
      );

      const metrics: Record<string, { avg: number; min: number; max: number }> = {};
      for (const row of result.rows as Array<{ metric_key: string; avg_value: string; min_value: number; max_value: number }>) {
        metrics[row.metric_key] = { avg: Number(row.avg_value), min: row.min_value, max: row.max_value };
      }

      return { zoneId, from: from.toISOString(), to: to.toISOString(), metrics };
    } finally {
      client.release();
    }
  }

  @Get('/v1/reports/summary.pdf')
  @Header('Content-Type', 'application/pdf')
  async summaryPdf(
    @Query('zoneId') zoneId: string | undefined,
    @Query('from') fromRaw: string | undefined,
    @Query('to') toRaw: string | undefined,
    @Res() res: Response,
  ) {
    if (!zoneId) throw new BadRequestException('Missing zoneId');

    const to = parseOptionalIsoDate(toRaw) ?? new Date();
    const from = parseOptionalIsoDate(fromRaw) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be <= to');

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT metric_key,
                avg(metric_value) AS avg_value,
                min(metric_value) AS min_value,
                max(metric_value) AS max_value
         FROM sensor_readings
         WHERE zone_id = $1 AND ts >= $2 AND ts <= $3
         GROUP BY metric_key
         ORDER BY metric_key`,
        [zoneId, from.toISOString(), to.toISOString()],
      );

      const filename = `summary-${zoneId}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      doc.pipe(res);

      doc.fontSize(18).text('Smart Farm Report (Summary)', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Zone: ${zoneId}`);
      doc.fontSize(10).fillColor('#444').text(`Range: ${from.toISOString()} → ${to.toISOString()}`);
      doc.fillColor('black');
      doc.moveDown(1);

      const startX = 40;
      const col1 = startX;
      const col2 = startX + 180;
      const col3 = startX + 280;
      const col4 = startX + 380;
      let y = doc.y;

      doc.fontSize(10).text('Metric', col1, y);
      doc.text('Avg', col2, y);
      doc.text('Min', col3, y);
      doc.text('Max', col4, y);
      y += 16;
      doc.moveTo(startX, y).lineTo(555, y).strokeColor('#ddd').stroke();
      y += 8;
      doc.strokeColor('black');

      for (const row of result.rows as Array<{ metric_key: string; avg_value: string; min_value: number; max_value: number }>) {
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
        doc.fontSize(10).text(row.metric_key, col1, y);
        doc.text(Number(row.avg_value).toFixed(3), col2, y);
        doc.text(Number(row.min_value).toFixed(3), col3, y);
        doc.text(Number(row.max_value).toFixed(3), col4, y);
        y += 14;
      }

      doc.end();
      return;
    } finally {
      client.release();
    }
  }

  @Get('/v1/reports/zone-comparison')
  async zoneComparison(
    @Query('farmId') farmId: string | undefined,
    @Query('metricKey') metricKey: string | undefined,
    @Query('from') fromRaw: string | undefined,
    @Query('to') toRaw: string | undefined,
  ) {
    if (!farmId) throw new BadRequestException('Missing farmId');
    if (!metricKey) throw new BadRequestException('Missing metricKey');

    const to = parseOptionalIsoDate(toRaw) ?? new Date();
    const from = parseOptionalIsoDate(fromRaw) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be <= to');

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT zone_id,
                avg(metric_value) AS avg_value,
                min(metric_value) AS min_value,
                max(metric_value) AS max_value
         FROM sensor_readings
         WHERE farm_id = $1 AND metric_key = $2 AND ts >= $3 AND ts <= $4
         GROUP BY zone_id
         ORDER BY zone_id`,
        [farmId, metricKey, from.toISOString(), to.toISOString()],
      );

      return {
        farmId,
        metricKey,
        from: from.toISOString(),
        to: to.toISOString(),
        zones: result.rows.map((r) => ({
          zoneId: r.zone_id as string,
          avg: Number(r.avg_value),
          min: Number(r.min_value),
          max: Number(r.max_value),
        })),
      };
    } finally {
      client.release();
    }
  }

  @Get('/v1/reports/sensor-health')
  async sensorHealth(
    @Query('farmId') farmId: string | undefined,
    @Query('offlineAfterMin') offlineAfterMinRaw: string | undefined,
    @Query('windowMin') windowMinRaw: string | undefined,
  ) {
    if (!farmId) throw new BadRequestException('Missing farmId');

    const offlineAfterMin = clampInt(offlineAfterMinRaw, 10, 1, 24 * 60);
    const windowMin = clampInt(windowMinRaw, 10, 1, 24 * 60);
    const now = Date.now();
    const offlineAfterMs = offlineAfterMin * 60 * 1000;

    const fromIso = new Date(now - windowMin * 60 * 1000).toISOString();
    const toIso = new Date(now).toISOString();

    const client = await this.db.pool.connect();
    try {
      const [devices, readingsAgg] = await Promise.all([
        client.query(
          `SELECT device_id, zone_id, name, last_seen_at
           FROM devices
           WHERE farm_id = $1
           ORDER BY zone_id, device_id`,
          [farmId],
        ),
        client.query(
          `SELECT device_id,
                  max(ts) AS last_reading_at,
                  count(*)::int AS points,
                  count(DISTINCT metric_key)::int AS distinct_metrics
           FROM sensor_readings
           WHERE farm_id = $1 AND ts >= $2 AND ts <= $3
           GROUP BY device_id`,
          [farmId, fromIso, toIso],
        ),
      ]);

      const aggByDevice = new Map<
        string,
        { lastReadingAt: string | null; points: number; distinctMetrics: number }
      >();
      for (const row of readingsAgg.rows as Array<{
        device_id: string;
        last_reading_at: Date | null;
        points: number;
        distinct_metrics: number;
      }>) {
        aggByDevice.set(row.device_id, {
          lastReadingAt: row.last_reading_at ? row.last_reading_at.toISOString() : null,
          points: row.points,
          distinctMetrics: row.distinct_metrics,
        });
      }

      return {
        farmId,
        offlineAfterMin,
        windowMin,
        devices: (devices.rows as Array<{ device_id: string; zone_id: string; name: string; last_seen_at: Date | null }>).map((d) => {
          const lastSeenAt = d.last_seen_at?.toISOString() ?? null;
          const online = d.last_seen_at ? now - d.last_seen_at.getTime() <= offlineAfterMs : false;
          const agg = aggByDevice.get(d.device_id) ?? { lastReadingAt: null, points: 0, distinctMetrics: 0 };
          return {
            deviceId: d.device_id,
            zoneId: d.zone_id,
            name: d.name,
            lastSeenAt,
            online,
            lastReadingAt: agg.lastReadingAt,
            pointsInWindow: agg.points,
            distinctMetricsInWindow: agg.distinctMetrics,
          };
        }),
      };
    } finally {
      client.release();
    }
  }

  @Get('/v1/reports/zone-series.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async zoneSeriesCsv(
    @Query('zoneId') zoneId: string | undefined,
    @Query('metricKey') metricKey: string | undefined,
    @Query('from') fromRaw: string | undefined,
    @Query('to') toRaw: string | undefined,
    @Query('rollup') rollupRaw: string | undefined,
    @Query('limit') limitRaw: string | undefined,
    @Res() res: Response,
  ) {
    if (!zoneId) throw new BadRequestException('Missing zoneId');
    if (!metricKey) throw new BadRequestException('Missing metricKey');

    const rollup = pickRollup(rollupRaw);
    const limit = clampInt(limitRaw, 10000, 1, 50000);

    const to = parseOptionalIsoDate(toRaw) ?? new Date();
    const from = parseOptionalIsoDate(fromRaw) ?? new Date(to.getTime() - 24 * 60 * 60 * 1000);
    if (from > to) throw new BadRequestException('from must be <= to');

    const client = await this.db.pool.connect();
    try {
      const filename = `zone-${zoneId}-${metricKey}-${rollup}.csv`.replace(/[^a-zA-Z0-9._-]/g, '_');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      if (rollup === 'raw') {
        const result = await client.query(
          `SELECT ts, metric_value AS value
           FROM sensor_readings
           WHERE zone_id = $1 AND metric_key = $2 AND ts >= $3 AND ts <= $4
           ORDER BY ts
           LIMIT $5`,
          [zoneId, metricKey, from.toISOString(), to.toISOString(), limit],
        );

        const lines = ['ts,value'];
        for (const row of result.rows as Array<{ ts: Date; value: number }>) {
          lines.push(`${row.ts.toISOString()},${row.value}`);
        }
        return res.status(200).send(lines.join('\n'));
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

      const lines = ['ts,value'];
      for (const row of result.rows as Array<{ ts: Date; value: string | null }>) {
        if (row.value === null) continue;
        lines.push(`${row.ts.toISOString()},${Number(row.value)}`);
      }
      return res.status(200).send(lines.join('\n'));
    } finally {
      client.release();
    }
  }
}
