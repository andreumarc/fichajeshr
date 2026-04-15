import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, IncidentStatus, IncidentType, UserRole } from '@prisma/client';
import { CreateIncidentDto, UpdateIncidentStatusDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  // ─── Employee: create own incident ────────────────────────────
  async createOwn(
    employeeId: string,
    companyId: string,
    dto: CreateIncidentDto,
    requesterId: string,
  ) {
    const incident = await this.prisma.incident.create({
      data: {
        companyId,
        employeeId,
        type: dto.type,
        description: dto.description,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        timeEntryId: dto.timeEntryId ?? null,
        status: IncidentStatus.OPEN,
        createdBy: requesterId,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    });

    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'Incident',
      entityId: incident.id,
      userId: requesterId,
      companyId,
      after: incident,
      description: `Incident created by employee ${employeeId}: ${dto.type}`,
    });

    return incident;
  }

  // ─── Admin/HR: create for any employee ────────────────────────
  async createByAdmin(companyId: string, dto: CreateIncidentDto, requesterId: string) {
    if (!dto.employeeId) throw new NotFoundException('employeeId requerido');

    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    return this.createOwn(dto.employeeId, companyId, dto, requesterId);
  }

  // ─── Get my incidents (employee) ──────────────────────────────
  async getMyIncidents(
    employeeId: string,
    filters: { status?: IncidentStatus; page?: number; limit?: number },
  ) {
    const { page = 1, limit = 25, status } = filters;
    const skip = (page - 1) * limit;
    const where: any = { employeeId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: +limit,
        include: {
          timeEntry: { select: { type: true, timestamp: true } },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  // ─── Admin/HR: get all incidents ──────────────────────────────
  async adminGetAll(
    companyId: string,
    filters: {
      employeeId?: string;
      status?: IncidentStatus;
      type?: IncidentType;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.from || filters.to) {
      where.occurredAt = {
        gte: filters.from ? new Date(filters.from) : undefined,
        lte: filters.to ? new Date(filters.to) : undefined,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.incident.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: +limit,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          timeEntry: { select: { type: true, timestamp: true } },
        },
      }),
      this.prisma.incident.count({ where }),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  // ─── Update incident status (HR/Admin) ────────────────────────
  async updateStatus(
    id: string,
    companyId: string,
    dto: UpdateIncidentStatusDto,
    resolverId: string,
  ) {
    const incident = await this.prisma.incident.findFirst({ where: { id, companyId } });
    if (!incident) throw new NotFoundException('Incidencia no encontrada');

    const before = { ...incident };
    const updated = await this.prisma.incident.update({
      where: { id },
      data: {
        status: dto.status as IncidentStatus,
        resolution: dto.resolution ?? incident.resolution,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(dto.status) ? new Date() : null,
        resolvedBy: ['RESOLVED', 'REJECTED'].includes(dto.status) ? resolverId : null,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    });

    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: id,
      userId: resolverId,
      companyId,
      before,
      after: updated,
      description: `Incident status updated to ${dto.status} by ${resolverId}`,
    });

    return updated;
  }

  // ─── Get summary stats ────────────────────────────────────────
  async getSummary(companyId: string) {
    const [open, inReview, resolved, byType] = await Promise.all([
      this.prisma.incident.count({ where: { companyId, status: IncidentStatus.OPEN } }),
      this.prisma.incident.count({ where: { companyId, status: IncidentStatus.IN_REVIEW } }),
      this.prisma.incident.count({ where: { companyId, status: IncidentStatus.RESOLVED } }),
      this.prisma.incident.groupBy({
        by: ['type'],
        where: { companyId },
        _count: { type: true },
      }),
    ]);
    return { open, inReview, resolved, byType };
  }
}
