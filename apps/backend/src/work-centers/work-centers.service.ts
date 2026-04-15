import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class WorkCentersService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  findAll(companyId: string) {
    return this.prisma.workCenter.findMany({
      where: { companyId, deletedAt: null },
      include: {
        _count: { select: { employees: true } },
        geofenceRules: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, companyId: string) {
    const center = await this.prisma.workCenter.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        employees: { where: { status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true } },
        geofenceRules: true,
      },
    });
    if (!center) throw new NotFoundException('Centro no encontrado');
    return center;
  }

  async create(companyId: string, dto: any, createdBy: string) {
    const center = await this.prisma.workCenter.create({
      data: { ...dto, companyId, createdBy },
    });

    if (dto.latitude && dto.longitude) {
      await this.prisma.geofenceRule.create({
        data: {
          companyId,
          workCenterId: center.id,
          name: `${center.name} - Geofence`,
          latitude: dto.latitude,
          longitude: dto.longitude,
          radiusMeters: dto.radiusMeters ?? 200,
          toleranceMeters: 50,
          createdBy,
        },
      });
    }

    await this.audit.log({
      action: AuditAction.CREATE, entityType: 'WorkCenter',
      entityId: center.id, userId: createdBy, companyId,
      after: center, description: `Work center ${center.name} created`,
    });

    return center;
  }

  async update(id: string, companyId: string, dto: any, updatedBy: string) {
    const center = await this.findOne(id, companyId);
    const before = { ...center };
    const updated = await this.prisma.workCenter.update({
      where: { id },
      data: { ...dto, updatedBy },
    });

    await this.audit.log({
      action: AuditAction.UPDATE, entityType: 'WorkCenter',
      entityId: id, userId: updatedBy, companyId,
      before, after: updated, description: `Work center ${updated.name} updated`,
    });

    return updated;
  }

  async exportToExcel(companyId: string): Promise<Buffer> {
    const centers = await this.prisma.workCenter.findMany({
      where: { companyId, deletedAt: null },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'Nombre', 'Código', 'Ciudad', 'Dirección', 'Latitud', 'Longitud',
      'Radio geofence (m)', 'Zona horaria', 'Requiere GPS', 'Permite remoto',
      'Activo', 'Nº empleados', 'Fecha creación',
    ];

    const rows = centers.map((c) => [
      c.name,
      c.code ?? '',
      c.city ?? '',
      c.address ?? '',
      c.latitude ?? '',
      c.longitude ?? '',
      c.radiusMeters ?? '',
      c.timezone,
      c.requireGps ? 'Sí' : 'No',
      c.allowRemote ? 'Sí' : 'No',
      c.isActive ? 'Activo' : 'Inactivo',
      c._count.employees,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES') : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Centros de trabajo');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async deactivate(id: string, companyId: string, userId: string) {
    const center = await this.findOne(id, companyId);
    await this.prisma.workCenter.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date(), updatedBy: userId },
    });

    await this.audit.log({
      action: AuditAction.DELETE, entityType: 'WorkCenter',
      entityId: id, userId, companyId,
      description: `Work center ${center.name} deactivated`,
    });
  }
}
