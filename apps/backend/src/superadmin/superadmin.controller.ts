import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { SuperAdminService } from './superadmin.service';
import { EmployeesService } from '../employees/employees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('SuperAdmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
@Controller('superadmin')
export class SuperAdminController {
  constructor(
    private readonly service: SuperAdminService,
    private readonly employeesService: EmployeesService,
  ) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get('companies')
  findAllCompanies() {
    return this.service.findAllCompanies();
  }

  @Post('companies')
  createCompany(@Body() dto: any) {
    return this.service.createCompany(dto);
  }

  @Get('companies/:id')
  findCompanyById(@Param('id') id: string) {
    return this.service.findCompanyById(id);
  }

  @Patch('companies/:id')
  updateCompany(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateCompany(id, dto);
  }

  @Delete('companies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteCompany(@Param('id') id: string) {
    return this.service.deleteCompany(id);
  }

  @Post('companies/:id/users')
  createUserForCompany(@Param('id') companyId: string, @Body() dto: any) {
    return this.service.createUserForCompany(companyId, dto);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.OK)
  deactivateUser(@Param('userId') userId: string) {
    return this.service.deactivateUser(userId);
  }

  // ── Employee management ───────────────────────────────────────────────────────

  @Get('companies/:id/employees')
  findCompanyEmployees(@Param('id') id: string) {
    return this.service.findCompanyEmployees(id);
  }

  @Post('companies/:id/employees')
  createEmployee(@Param('id') companyId: string, @Body() dto: any) {
    return this.service.createEmployee(companyId, dto);
  }

  @Delete('companies/:companyId/employees/:employeeId')
  @HttpCode(HttpStatus.OK)
  deactivateEmployee(@Param('companyId') companyId: string, @Param('employeeId') employeeId: string) {
    return this.service.deactivateEmployee(employeeId, companyId);
  }

  @Get('companies/:id/work-centers')
  findCompanyWorkCenters(@Param('id') id: string) {
    return this.service.findCompanyWorkCenters(id);
  }

  // ── Global employee management ────────────────────────────────────────────────

  @Get('employees')
  findAllEmployees(@Query('companyId') companyId?: string) {
    return this.service.findAllEmployees(companyId);
  }

  @Delete('employees/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEmployee(@Param('id') id: string) {
    return this.service.deleteEmployee(id);
  }

  // ── Global time entries management ────────────────────────────────────────────

  @Get('time-entries')
  findAllTimeEntries(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('companyId') companyId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.service.findAllTimeEntries(+page, +limit, companyId, employeeId);
  }

  @Delete('time-entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTimeEntry(@Param('id') id: string) {
    return this.service.deleteTimeEntry(id);
  }

  @Delete('employees/:id/time-entries')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAllTimeEntriesForEmployee(@Param('id') id: string) {
    return this.service.deleteAllTimeEntriesForEmployee(id);
  }

  @Post('employees/:id/reset-user-password')
  resetEmployeePassword(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.resetEmployeePassword(id, user.id);
  }

  // ── Excel exports ────────────────────────────────────────────────────────────

  @Get('companies/export/excel')
  async exportCompanies(@Res() res: Response) {
    const buffer = await this.service.exportCompaniesToExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="empresas.xlsx"');
    res.end(buffer);
  }

  @Get('companies/:id/employees/export/excel')
  async exportCompanyEmployees(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.exportCompanyEmployeesToExcel(id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="empleados.xlsx"');
    res.end(buffer);
  }

  // ── Excel import for a specific company ──────────────────────────────────────

  @Get('companies/:id/employees/import/template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.employeesService.generateImportTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla_empleados.xlsx"');
    res.end(buffer);
  }

  @Post('companies/:id/employees/import')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importEmployees(
    @Param('id') companyId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new Error('No se recibió ningún archivo');
    return this.employeesService.importFromExcel(file.buffer, companyId, user.id);
  }
}
