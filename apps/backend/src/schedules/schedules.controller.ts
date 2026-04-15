import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly service: SchedulesService) {}

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.companyId);
  }

  @Get('employees-overview')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  getEmployeesOverview(@CurrentUser() user: any) {
    return this.service.getCompanyEmployeesWithSchedules(user.companyId);
  }

  @Get('my')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.COMPANY_ADMIN)
  getMySchedule(@CurrentUser() user: any) {
    return this.service.getEmployeeSchedule(user.employeeId);
  }

  @Get('my/compliance')
  @Roles(UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.HR, UserRole.COMPANY_ADMIN)
  getMyCompliance(@CurrentUser() user: any) {
    return this.service.getEmployeeTodayCompliance(user.employeeId);
  }

  @Get(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.companyId);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(user.companyId, dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, user.companyId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.delete(id, user.companyId);
  }

  @Post('employees/:employeeId/assign')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  assign(
    @Param('employeeId') employeeId: string,
    @Body() dto: { scheduleId: string; startDate: string; endDate?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.assignToEmployee(
      user.companyId,
      employeeId,
      dto.scheduleId,
      dto.startDate,
      dto.endDate,
      user.id,
    );
  }

  @Get('employees/:employeeId')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  getEmployeeSchedule(@Param('employeeId') employeeId: string) {
    return this.service.getEmployeeSchedule(employeeId);
  }
}
