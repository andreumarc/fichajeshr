import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, TimeEntryType, TimeEntryStatus } from '@prisma/client';

@ApiTags('Time Entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly service: TimeEntriesService) {}

  // ---- Employee self-service ----

  @Post('clock-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Employee clock in' })
  clockIn(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.clockIn(user.employee.id, user.companyId, dto, this.getMeta(req));
  }

  @Post('clock-out')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Employee clock out' })
  clockOut(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.clockOut(user.employee.id, user.companyId, dto, this.getMeta(req));
  }

  @Post('break-start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start break' })
  breakStart(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.breakStart(user.employee.id, user.companyId, dto, this.getMeta(req));
  }

  @Post('break-end')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'End break' })
  breakEnd(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.breakEnd(user.employee.id, user.companyId, dto, this.getMeta(req));
  }

  @Post('incident')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register incident' })
  incident(@Body() dto: CreateTimeEntryDto, @CurrentUser() user: any, @Req() req: Request) {
    return this.service.registerIncident(user.employee.id, user.companyId, dto, this.getMeta(req));
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current clock status' })
  getStatus(@CurrentUser() user: any) {
    return this.service.getCurrentStatus(user.employee.id);
  }

  @Get('my-history')
  @ApiOperation({ summary: 'Get personal clock history' })
  getMyHistory(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.getMyHistory(user.employee.id, { from, to, page: +page, limit: +limit });
  }

  @Get('my')
  @ApiOperation({ summary: 'Get personal clock history (alias for my-history)' })
  getMyHistoryAlias(
    @CurrentUser() user: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.getMyHistory(user.employee.id, { from, to, page: +page, limit: +limit });
  }

  @Get('my/status')
  @ApiOperation({ summary: 'Get current clock status (alias)' })
  getMyStatus(@CurrentUser() user: any) {
    return this.service.getCurrentStatus(user.employee.id);
  }

  @Get('daily-summary')
  @ApiOperation({ summary: 'Get daily worked hours summary' })
  getDailySummary(@CurrentUser() user: any, @Query('date') date?: string) {
    const targetDate = date ?? new Date().toISOString().split('T')[0];
    return this.service.getDailySummary(user.employee.id, targetDate);
  }

  // ---- Admin / HR ----

  @Get()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Admin: list all time entries with filters' })
  adminGetAll(
    @CurrentUser() user: any,
    @Query('employeeId') employeeId?: string,
    @Query('workCenterId') workCenterId?: string,
    @Query('type') type?: TimeEntryType,
    @Query('status') status?: TimeEntryStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.adminGetAll(user.companyId, {
      employeeId,
      workCenterId,
      type,
      status,
      from,
      to,
      page: +page,
      limit: +limit,
    });
  }

  @Patch(':id/manual-edit')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.HR, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Admin: manually edit a time entry with full audit trail' })
  manualEdit(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    return this.service.manualEdit(id, user.companyId, user.id, data, this.getMeta(req));
  }

  private getMeta(req: Request) {
    return {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    };
  }
}
