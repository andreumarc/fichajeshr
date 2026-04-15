import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { GeofenceModule } from '../geofence/geofence.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [GeofenceModule, AuditModule],
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
