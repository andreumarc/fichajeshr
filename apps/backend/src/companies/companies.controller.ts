import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  @Roles(UserRole.SUPERADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.RRHH, UserRole.DIRECCION_CLINICA, UserRole.SUPERADMIN)
  getMyCompany(@CurrentUser() user: any) {
    return this.service.findOne(user.companyId);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  updateMyCompany(@Body() dto: any, @CurrentUser() user: any) {
    return this.service.update(user.companyId, dto);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    const companyId = user.role === UserRole.SUPERADMIN ? id : user.companyId;
    return this.service.update(companyId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
