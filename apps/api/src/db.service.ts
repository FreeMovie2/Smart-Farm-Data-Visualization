import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST ?? 'db',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? 'smart_farm',
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}

