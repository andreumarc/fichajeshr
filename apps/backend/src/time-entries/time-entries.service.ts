import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeofenceService } from '../geofence/geofence.service';
import { AuditService } from '../audit/audit.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { TimeEntryType, TimeEntryStatus, IncidentType, AuditAction, DeviceType } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class TimeEntriesService {
  private readonly logger = new Logger(TimeEntriesService.name);

  constructor(
    private prisma: PrismaService,
    private geofence: GeofenceService,
    private audit: AuditService,
  ) {}

  async clockIn(
    employeeId: string,
    companyId: string,
    dto: CreateTimeEntryDto,
    meta: { ip: string; userAgent: string },
  ) {
    // --- Business rule: cannot check-in if already checked in ---
    const lastEntry = await this.getLastEntry(employeeId);

    if (lastEntry) {
      if (lastEntry.type === TimeEntryType.CHECK_IN || lastEntry.type === TimeEntryType.BREAK_END) {
        throw new BadRequestException(
          'Ya tienes una jornada activa. Ficha salida antes de volver a entrar.',
        );
      }
      if (lastEntry.type === TimeEntryType.BREAK_START) {
        throw new BadRequestException(
          'Tienes una pausa activa. Finaliza la pausa antes de registrar nueva entrada.',
        );
      }
    }

    return this.createEntry(employeeId, companyId, dto, TimeEntryType.CHECK_IN, meta);
  }

  async clockOut(
    employeeId: string,
    companyId: string,
    dto: CreateTimeEntryDto,
    meta: { ip: string; userAgent: string },
  ) {
    const lastEntry = await this.getLastEntry(employeeId);

    if (!lastEntry) {
      throw new BadRequestException('No hay jornada activa. Ficha entrada primero.');
    }
    if (lastEntry.type === TimeEntryType.CHECK_OUT) {
      throw new BadRequestException('La jornada ya está finalizada.');
    }
    if (lastEntry.type === TimeEntryType.BREAK_START) {
      throw new BadRequestException('Tienes una pausa activa. Cierra la pausa antes de fichar salida.');
    }

    return this.createEntry(employeeId, companyId, dto, TimeEntryType.CHECK_OUT, meta);
  }

  async breakStart(
    employeeId: string,
    companyId: string,
    dto: CreateTimeEntryDto,
    meta: { ip: string; userAgent: string },
  ) {
    const lastEntry = await this.getLastEntry(employeeId);

    if (!lastEntry || lastEntry.type === TimeEntryType.CHECK_OUT) {
      throw new BadRequestException('No hay jornada activa. Ficha entrada primero.');
    }
    if (lastEntry.type === TimeEntryType.BREAK_START) {
      throw new BadRequestException('Ya tienes una pausa activa.');
    }

    return this.createEntry(employeeId, companyId, dto, TimeEntryType.BREAK_START, meta);
  }

  async breakEnd(
    employeeId: string,
    companyId: string,
    dto: CreateTimeEntryDto,
    meta: { ip: string; userAgent: string },
  ) {
    const lastEntry = await this.getLastEntry(employeeId);

    if (!lastEntry || lastEntry.type !== TimeEntryType.BREAK_START) {
      throw new BadRequestException('No hay pausa activa para finalizar.');
    }

    return this.createEntry(employeeId, companyId, dto, TimeEntryType.BREAK_END, meta);
  }

  async registerIncident(
    employeeId: string,
    companyId: string,
    dto: CreateTimeEntryDto,
    meta: { ip: string; userAgent: string },
  ) {
    return this.createEntry(employeeId, companyId, dto, TimeEntryType.INCIDENT, meta);
  }

  private async createEntry(
    employeeId: string,
    companyId: string,
    dto: CreateTimeEntryDto,
    type: TimeEntryType,
    meta: { ip: string; userAgent: string },
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        workCenter: true,
        company: true,
      },
    });

    if (!employee) throw new NotFoundException('Empleado no encontrado');

    // Determine work center
    const workCenterId = dto.workCenterId ?? employee.workCenterId ?? undefined;
    const workCenter = workCenterId
      ? await this.prisma.workCenter.findUnique({ where: { id: workCenterId } })
      : null;

    // --- Geofence validation ---
    let status: TimeEntryStatus = TimeEntryStatus.VALID;
    let distanceToCenter: number | undefined;
    let isWithinZone: boolean | undefined;
    let geofenceRuleId: string | undefined;

    if (dto.latitude && dto.longitude && workCenter?.latitude && workCenter?.longitude) {
      const geofenceRule = await this.prisma.geofenceRule.findFirst({
        where: { workCenterId, isActive: true },
      });

      const radiusMeters = geofenceRule?.radiusMeters ?? workCenter.radiusMeters ?? 200;
      const toleranceMeters = geofenceRule?.toleranceMeters ?? 50;

      const check = this.geofence.checkGeofence(
        { latitude: dto.latitude, longitude: dto.longitude },
        { latitude: workCenter.latitude, longitude: workCenter.longitude },
        radiusMeters,
        toleranceMeters,
      );

      distanceToCenter = check.distanceMeters;
      isWithinZone = check.isWithinZone;
      geofenceRuleId = geofenceRule?.id;

      if (!check.isWithinZone) {
        status = TimeEntryStatus.OUT_OF_ZONE;
        // Create incident for out-of-zone clock
        await this.prisma.incident.create({
          data: {
            companyId,
            employeeId,
            type: IncidentType.OUT_OF_ZONE,
            status: 'OPEN',
            description: `Fichaje fuera de zona. Distancia al centro: ${check.distanceMeters}m (radio permitido: ${radiusMeters}m)`,
            occurredAt: new Date(dto.timestamp ?? Date.now()),
            createdBy: employeeId,
          },
        });
      }
    }

    const entry = await this.prisma.timeEntry.create({
      data: {
        companyId,
        employeeId,
        workCenterId: workCenterId ?? null,
        type,
        status,
        timestamp: dto.timestamp ? new Date(dto.timestamp) : new Date(),
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        accuracy: dto.accuracy ?? null,
        altitude: dto.altitude ?? null,
        distanceToCenter: distanceToCenter ?? null,
        isWithinZone: isWithinZone ?? null,
        geofenceRuleId: geofenceRuleId ?? null,
        deviceType: dto.deviceType ?? DeviceType.UNKNOWN,
        deviceId: dto.deviceId ?? null,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        appVersion: dto.appVersion ?? null,
        clockMethod: dto.clockMethod ?? 'EMAIL_PASSWORD',
        notes: dto.notes ?? null,
        isManual: false,
        isOffline: dto.isOffline ?? false,
        syncedAt: dto.isOffline && dto.syncedAt ? new Date(dto.syncedAt) : null,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        workCenter: { select: { name: true, city: true } },
      },
    });

    await this.audit.log({
      action: AuditAction.CLOCK_IN,
      entityType: 'TimeEntry',
      entityId: entry.id,
      userId: undefined,
      companyId,
      after: entry,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      description: `${type} registered for employee ${employeeId}. Status: ${status}`,
    });

    return entry;
  }

  async getCurrentStatus(employeeId: string) {
    const lastEntry = await this.getLastEntry(employeeId);

    if (!lastEntry) return { status: 'NOT_CLOCKED_IN', lastEntry: null };

    const statusMap: Record<string, string> = {
      CHECK_IN: 'WORKING',
      CHECK_OUT: 'CLOCKED_OUT',
      BREAK_START: 'ON_BREAK',
      BREAK_END: 'WORKING',
      INCIDENT: 'INCIDENT',
    };

    return {
      status: statusMap[lastEntry.type] ?? 'UNKNOWN',
      lastEntry,
    };
  }

  async getMyHistory(
    employeeId: string,
    filters: { from?: string; to?: string; page?: number; limit?: number },
  ) {
    const { page = 1, limit = 50, from, to } = filters;
    const skip = (page - 1) * limit;

    const where: any = { employeeId };
    if (from || to) {
      where.timestamp = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined };
    }

    const [data, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: +limit,
        include: { workCenter: { select: { name: true, city: true } } },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  async adminGetAll(
    companyId: string,
    filters: {
      employeeId?: string;
      workCenterId?: string;
      type?: TimeEntryType;
      status?: TimeEntryStatus;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 50, ...where } = filters;
    const skip = (page - 1) * limit;

    const prismaWhere: any = { companyId };
    if (where.employeeId) prismaWhere.employeeId = where.employeeId;
    if (where.workCenterId) prismaWhere.workCenterId = where.workCenterId;
    if (where.type) prismaWhere.type = where.type;
    if (where.status) prismaWhere.status = where.status;
    if (where.from || where.to) {
      prismaWhere.timestamp = {
        gte: where.from ? new Date(where.from) : undefined,
        lte: where.to ? new Date(where.to) : undefined,
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where: prismaWhere,
        orderBy: { timestamp: 'desc' },
        skip,
        take: +limit,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          workCenter: { select: { name: true, city: true } },
        },
      }),
      this.prisma.timeEntry.count({ where: prismaWhere }),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  async manualEdit(
    id: string,
    companyId: string,
    editorUserId: string,
    data: { timestamp?: Date; notes?: string; status?: TimeEntryStatus; reviewNotes?: string },
    meta: { ip: string; userAgent: string },
  ) {
    const entry = await this.prisma.timeEntry.findFirst({ where: { id, companyId } });
    if (!entry) throw new NotFoundException('Fichaje no encontrado');

    const before = { ...entry };
    const updated = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...data,
        isManual: true,
        status: data.status ?? TimeEntryStatus.MANUAL,
        updatedBy: editorUserId,
        reviewedBy: editorUserId,
        reviewedAt: new Date(),
      },
    });

    await this.audit.log({
      action: AuditAction.MANUAL_EDIT,
      entityType: 'TimeEntry',
      entityId: id,
      userId: editorUserId,
      companyId,
      before,
      after: updated,
      diff: data,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      description: `Manual edit on TimeEntry by ${editorUserId}. Reason: ${data.reviewNotes ?? 'No reason provided'}`,
    });

    return updated;
  }

  async getDailySummary(employeeId: string, date: string) {
    const dayStart = dayjs(date).startOf('day').toDate();
    const dayEnd = dayjs(date).endOf('day').toDate();

    const entries = await this.prisma.timeEntry.findMany({
      where: { employeeId, timestamp: { gte: dayStart, lte: dayEnd } },
      orderBy: { timestamp: 'asc' },
    });

    return this.calculateWorkedHours(entries);
  }

  calculateWorkedHours(entries: any[]) {
    let totalWorkedMs = 0;
    let totalBreakMs = 0;
    let checkInTime: Date | null = null;
    let breakStartTime: Date | null = null;

    for (const entry of entries) {
      if (entry.type === TimeEntryType.CHECK_IN || entry.type === TimeEntryType.BREAK_END) {
        if (!checkInTime) checkInTime = entry.timestamp;
      }
      if (entry.type === TimeEntryType.CHECK_OUT) {
        if (checkInTime) {
          totalWorkedMs += entry.timestamp.getTime() - checkInTime.getTime();
          checkInTime = null;
        }
      }
      if (entry.type === TimeEntryType.BREAK_START) {
        breakStartTime = entry.timestamp;
      }
      if (entry.type === TimeEntryType.BREAK_END) {
        if (breakStartTime) {
          totalBreakMs += entry.timestamp.getTime() - breakStartTime.getTime();
          breakStartTime = null;
        }
      }
    }

    const netWorkedMs = totalWorkedMs - totalBreakMs;
    return {
      totalWorkedMinutes: Math.floor(totalWorkedMs / 60000),
      totalBreakMinutes: Math.floor(totalBreakMs / 60000),
      netWorkedMinutes: Math.floor(netWorkedMs / 60000),
      totalWorkedHours: (totalWorkedMs / 3600000).toFixed(2),
      netWorkedHours: (netWorkedMs / 3600000).toFixed(2),
    };
  }

  private async getLastEntry(employeeId: string) {
    const today = dayjs().startOf('day').toDate();
    return this.prisma.timeEntry.findFirst({
      where: { employeeId, timestamp: { gte: today } },
      orderBy: { timestamp: 'desc' },
    });
  }
}
