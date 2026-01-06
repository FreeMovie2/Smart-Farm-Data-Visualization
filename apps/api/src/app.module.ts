import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { IngestController } from './ingest.controller';
import { DbService } from './db.service';
import { DashboardController } from './dashboard.controller';
import { ZonesController } from './zones.controller';
import { AlertsController } from './alerts.controller';
import { DevicesController } from './devices.controller';
import { EventsController } from './events.controller';
import { ReportsController } from './reports.controller';

@Module({
  imports: [],
  controllers: [
    HealthController,
    IngestController,
    DashboardController,
    ZonesController,
    AlertsController,
    DevicesController,
    EventsController,
    ReportsController,
  ],
  providers: [DbService],
})
export class AppModule {}
