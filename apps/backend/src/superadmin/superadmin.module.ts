import { Module } from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';
import { AuditModule } from '../audit/audit.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [AuditModule, EmployeesModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
