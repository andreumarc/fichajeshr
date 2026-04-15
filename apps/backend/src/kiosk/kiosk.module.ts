import { Module } from '@nestjs/common';
import { KioskController } from './kiosk.controller';
import { KioskService } from './kiosk.service';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { AuditModule } from '../audit/audit.module';
import { GeofenceModule } from '../geofence/geofence.module';

@Module({
  imports: [TimeEntriesModule, AuditModule, GeofenceModule],
  controllers: [KioskController],
  providers: [KioskService],
})
export class KioskModule {}
