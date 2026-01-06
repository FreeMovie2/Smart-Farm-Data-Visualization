import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { DbService } from './db.service';

@Module({
  providers: [DbService, WorkerService],
})
export class AppModule {}
