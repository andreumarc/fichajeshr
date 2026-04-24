import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, EmployeeStatus } from '@prisma/client';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'List employees with filters' })
  findAll(
    @CurrentUser() user: any,
    @Query('status') status?: EmployeeStatus,
    @Query('workCenterId') workCenterId?: string,
    @Query('department') department?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.service.findAll(user.companyId, { status, workCenterId, department, search, page: +page, limit: +limit });
  }

  @Get('today-status')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get today clock status for all employees' })
  getTodayStatus(@CurrentUser() user: any) {
    return this.service.getTodayStatus(user.companyId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user.companyId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Create employee' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: any) {
    return this.service.create(user.companyId, dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser() user: any) {
    return this.service.update(id, user.companyId, dto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.deactivate(id, user.companyId, user.id);
  }

  @Post(':id/reset-pin')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reset employee PIN' })
  resetPin(@Param('id') id: string, @Body() body: { pin: string }, @CurrentUser() user: any) {
    return this.service.resetPin(id, user.companyId, body.pin, user.id);
  }

  @Post(':id/generate-qr')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Generate QR code for employee' })
  generateQr(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.generateQrCode(id, user.companyId);
  }

  @Post(':id/reset-user-password')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Reset employee user password (admin)' })
  resetUserPassword(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.resetUserPassword(id, user.companyId, user.id);
  }

  @Get(':id/user-info')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get linked user info for an employee' })
  getUserInfo(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getUserInfo(id, user.companyId);
  }

  // ── Excel export ─────────────────────────────────────────────────────────────

  @Get('export/excel')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Export all employees to Excel' })
  async exportExcel(@CurrentUser() user: any, @Res() res: Response) {
    const buffer = await this.service.exportToExcel(user.companyId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="empleados.xlsx"');
    res.end(buffer);
  }

  // ── Excel import / template ───────────────────────────────────────────────────

  @Get('import/template')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Download Excel import template' })
  downloadTemplate(@Res() res: Response) {
    const buffer = this.service.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_empleados.xlsx"');
    res.end(buffer);
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Bulk import employees from Excel file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importEmployees(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new Error('No se recibió ningún archivo');
    return this.service.importFromExcel(file.buffer, user.companyId, user.id);
  }
}
