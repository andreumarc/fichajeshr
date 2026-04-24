import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { LeaveRequestsService } from './leave-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, LeaveStatus, LeaveType } from '@prisma/client';

@ApiTags('Leave Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveRequestsService) {}

  // Employee endpoints
  @Post()
  @Roles(UserRole.AUXILIAR, UserRole.DIRECCION_CLINICA, UserRole.RRHH, UserRole.ADMIN)
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(user.companyId, user.employeeId, dto);
  }

  @Get('my')
  @Roles(UserRole.AUXILIAR, UserRole.DIRECCION_CLINICA, UserRole.RRHH, UserRole.ADMIN)
  myRequests(@CurrentUser() user: any) {
    return this.service.findMyRequests(user.employeeId);
  }

  @Get('my/balance')
  @Roles(UserRole.AUXILIAR, UserRole.DIRECCION_CLINICA, UserRole.RRHH, UserRole.ADMIN)
  myBalance(@CurrentUser() user: any) {
    return this.service.getBalance(user.employeeId);
  }

  @Patch('my/:id/cancel')
  @Roles(UserRole.AUXILIAR, UserRole.DIRECCION_CLINICA)
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.cancel(id, user.employeeId);
  }

  // HR/Admin endpoints
  @Get()
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: LeaveStatus,
    @Query('type') type?: LeaveType,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAll(user.companyId, { status, type, employeeId });
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  stats(@CurrentUser() user: any) {
    return this.service.getStats(user.companyId);
  }

  @Post('sick-leave')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  createSickLeave(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.createSickLeave(user.companyId, dto);
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  review(
    @Param('id') id: string,
    @Body() dto: { action: 'approve' | 'reject'; hrNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.review(id, user.companyId, user.id, dto.action, dto.hrNotes);
  }

  @Get(':employeeId/balance')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  getBalance(@Param('employeeId') employeeId: string) {
    return this.service.getBalance(employeeId);
  }
}
