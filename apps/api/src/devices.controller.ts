import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { DbService } from './db.service';
import { clampInt } from './http.utils';

@Controller()
export class DevicesController {
  constructor(private readonly db: DbService) {}

  @Get('/v1/devices')
  async list(@Query('farmId') farmId: string | undefined, @Query('offlineAfterMin') offlineAfterMinRaw: string | undefined) {
    if (!farmId) throw new BadRequestException('Missing farmId');
    const offlineAfterMin = clampInt(offlineAfterMinRaw, 10, 1, 24 * 60);
    const offlineAfterMs = offlineAfterMin * 60 * 1000;
    const now = Date.now();

    const client = await this.db.pool.connect();
    try {
      const result = await client.query(
        `SELECT device_id, device_key, farm_id, zone_id, name, last_seen_at
         FROM devices
         WHERE farm_id = $1
         ORDER BY zone_id, device_id`,
        [farmId],
      );

      return {
        farmId,
        offlineAfterMin,
        devices: (result.rows as Array<{
          device_id: string;
          device_key: string;
          farm_id: string;
          zone_id: string;
          name: string;
          last_seen_at: Date | null;
        }>).map((r) => ({
          deviceId: r.device_id,
          farmId: r.farm_id,
          zoneId: r.zone_id,
          name: r.name,
          lastSeenAt: r.last_seen_at?.toISOString() ?? null,
          online: r.last_seen_at ? now - r.last_seen_at.getTime() <= offlineAfterMs : false,
        })),
      };
    } finally {
      client.release();
    }
  }
}

