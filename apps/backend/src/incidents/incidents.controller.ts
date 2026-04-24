import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import {
  CreateIncidentDto,
  UpdateIncidentStatusDto,
} from './dto/create-incident.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IncidentStatus, IncidentType, UserRole } from '@prisma/client';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  // ─── Employee endpoints ────────────────────────────────────────

  @Post('my')
  @ApiOperation({ summary: 'Create incident for myself' })
  createOwn(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.service.createOwn(
      user.employeeId,
      user.companyId,
      dto,
      user.id,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my incidents' })
  getMyIncidents(
    @CurrentUser() user: any,
    @Query('status') status?: IncidentStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 25,
  ) {
    return this.service.getMyIncidents(user.employeeId, { status, page: +page, limit: +limit });
  }

  // ─── Admin/HR endpoints ────────────────────────────────────────

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA)
  @ApiOperation({ summary: 'Get all incidents (admin)' })
  adminGetAll(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: IncidentStatus,
    @Query('type') type?: IncidentType,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.adminGetAll(user.companyId, {
      employeeId, status, type, from, to,
      page: +page, limit: +limit,
    });
  }

  @Get('summary')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA)
  getSummary(@CurrentUser() user: any) {
    return this.service.getSummary(user.companyId);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.RRHH)
  @ApiOperation({ summary: 'Create incident for an employee (admin)' })
  createByAdmin(@Body() dto: CreateIncidentDto, @CurrentUser() user: any) {
    return this.service.createByAdmin(user.companyId, dto, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.RRHH)
  @ApiOperation({ summary: 'Update incident status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateStatus(id, user.companyId, dto, user.id);
  }
}
