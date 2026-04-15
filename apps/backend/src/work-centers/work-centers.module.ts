import { Module } from '@nestjs/common';
import { WorkCentersController } from './work-centers.controller';
import { WorkCentersService } from './work-centers.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [WorkCentersController],
  providers: [WorkCentersService],
  exports: [WorkCentersService],
})
export class WorkCentersModule {}
