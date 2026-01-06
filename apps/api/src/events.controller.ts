import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { DbService } from './db.service';
import { clampInt, parseOptionalIsoDate } from './http.utils';

type CreateEventBody = {
  farmId?: string;
  zoneId?: string;
  eventType?: string;
  title?: string;
  details?: string;
  ts?: string;
  createdBy?: string;
};

@Controller()
export class EventsController {
  constructor(private readonly db: DbService) {}

  @Get('/v1/events')
  async list(
    @Query('farmId') farmId: string | undefined,
    @Query('zoneId') zoneId: string | undefined,
    @Query('from') fromRaw: string | undefined,
    @Query('to') toRaw: string | undefined,
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

    const from = parseOptionalIsoDate(fromRaw);
    const to = parseOptionalIsoDate(toRaw);
    if (from) {
      params.push(from.toISOString());
      where.push(`ts >= $${params.length}`);
    }
    if (to) {
      params.push(to.toISOString());
      where.push(`ts <= $${params.length}`);
    }

    params.push(limit);
    const limitParam = `$${params.length}`;

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT event_id, farm_id, zone_id, event_type, title, details, ts, created_by, created_at
         FROM events
         WHERE ${where.join(' AND ')}
         ORDER BY ts DESC
         LIMIT ${limitParam}`,
        params,
      );

      return {
        farmId,
        events: result.rows.map((r) => ({
          eventId: r.event_id,
          farmId: r.farm_id,
          zoneId: r.zone_id,
          eventType: r.event_type,
          title: r.title,
          details: r.details,
          ts: (r.ts as Date).toISOString(),
          createdBy: r.created_by,
          createdAt: (r.created_at as Date).toISOString(),
        })),
      };
    } finally {
      client.release();
    }
  }

  @Post('/v1/events')
  async create(@Body() body: CreateEventBody) {
    if (!body.farmId) throw new BadRequestException('Missing farmId');
    if (!body.zoneId) throw new BadRequestException('Missing zoneId');
    if (!body.eventType) throw new BadRequestException('Missing eventType');
    if (!body.title) throw new BadRequestException('Missing title');

    const ts = body.ts ? new Date(body.ts) : new Date();
    if (Number.isNaN(ts.getTime())) throw new BadRequestException('Invalid ts');

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO events (farm_id, zone_id, event_type, title, details, ts, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING event_id`,
        [
          body.farmId,
          body.zoneId,
          body.eventType,
          body.title,
          body.details ?? null,
          ts.toISOString(),
          body.createdBy ?? null,
        ],
      );

      return { ok: true, eventId: result.rows[0].event_id as number };
    } finally {
      client.release();
    }
  }
}

