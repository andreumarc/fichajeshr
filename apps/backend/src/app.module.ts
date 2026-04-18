import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DemoReadonlyGuard } from './auth/guards/demo-readonly.guard';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { WorkCentersModule } from './work-centers/work-centers.module';
import { TimeEntriesModule } from './time-entries/time-entries.module';
import { KioskModule } from './kiosk/kiosk.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';
import { CompaniesModule } from './companies/companies.module';
import { GeofenceModule } from './geofence/geofence.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { IncidentsModule } from './incidents/incidents.module';
import { HealthController } from './health/health.controller';
import { SuperAdminModule } from './superadmin/superadmin.module';
import { SchedulesModule } from './schedules/schedules.module';
import { LeaveRequestsModule } from './leave-requests/leave-requests.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    EmployeesModule,
    WorkCentersModule,
    TimeEntriesModule,
    KioskModule,
    ReportsModule,
    AuditModule,
    GeofenceModule,
    WhatsAppModule,
    IncidentsModule,
    SuperAdminModule,
    SchedulesModule,
    LeaveRequestsModule,
    MailModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: DemoReadonlyGuard },
  ],
})
export class AppModule {}
