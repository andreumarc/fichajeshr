import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { WorkCentersService } from './work-centers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Work Centers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('work-centers')
export class WorkCentersController {
  constructor(private readonly service: WorkCentersService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.companyId);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  create(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.create(user.companyId, dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(id, user.companyId, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user.companyId, user.id);
  }

  @Get('export/excel')
  async exportExcel(@CurrentUser() user: any, @Res() res: Response) {
    const buffer = await this.service.exportToExcel(user.companyId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="centros_trabajo.xlsx"');
    res.end(buffer);
  }
}
