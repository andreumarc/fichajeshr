import {
  Controller, Get, Query, Res, UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  getDashboard(@CurrentUser() user: any) {
    return this.service.getDashboardStats(user.companyId);
  }

  @Get('monthly-summary')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  getMonthlySummary(
    @CurrentUser() user: any,
    @Query('year') year: number,
    @Query('month') month: number,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.getMonthlySummary(user.companyId, +year, +month, employeeId);
  }

  @Get('incidents')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  getIncidents(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getIncidentsSummary(user.companyId, from, to);
  }

  @Get('export-excel')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  async exportExcel(
    @CurrentUser() user: any,
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportToExcel(user.companyId, from, to);
    const filename = `fichajes_${from}_${to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
