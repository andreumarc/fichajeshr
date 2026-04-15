import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import { AuditService } from '../audit/audit.service';
import { GeofenceService } from '../geofence/geofence.service';
import * as bcrypt from 'bcryptjs';
import { ClockMethod, TimeEntryType, DeviceType } from '@prisma/client';
import { KioskClockDto } from './dto/kiosk-clock.dto';
import { KioskIdentifyDto } from './dto/kiosk-identify.dto';

@Injectable()
export class KioskService {
  private readonly logger = new Logger(KioskService.name);

  constructor(
    private prisma: PrismaService,
    private timeEntriesService: TimeEntriesService,
    private auditService: AuditService,
    private geofenceService: GeofenceService,
  ) {}

  /**
   * STEP 1: Identify employee by PIN, code, or QR.
   * Returns only safe public data — no sensitive info.
   */
  async identifyEmployee(dto: KioskIdentifyDto, companyId: string) {
    let employee: any = null;

    if (dto.method === ClockMethod.PIN) {
      if (!dto.employeeCode || !dto.pin) {
        throw new BadRequestException('Código de empleado y PIN son obligatorios');
      }
      employee = await this.prisma.employee.findFirst({
        where: { employeeCode: dto.employeeCode, companyId, status: 'ACTIVE', allowKiosk: true },
        include: {
          credentials: { where: { method: ClockMethod.PIN, isActive: true } },
          workCenter: { select: { id: true, name: true } },
        },
      });

      if (!employee) throw new UnauthorizedException('Empleado no encontrado o no autorizado');

      const pinCredential = employee.credentials[0];
      if (!pinCredential) throw new UnauthorizedException('PIN no configurado para este empleado');

      const isPinValid = await bcrypt.compare(dto.pin, pinCredential.secret);
      if (!isPinValid) throw new UnauthorizedException('PIN incorrecto');

      await this.prisma.employeeCredential.update({
        where: { id: pinCredential.id },
        data: { lastUsed: new Date() },
      });
    } else if (dto.method === ClockMethod.EMPLOYEE_CODE) {
      if (!dto.employeeCode) throw new BadRequestException('Código de empleado obligatorio');
      employee = await this.prisma.employee.findFirst({
        where: { employeeCode: dto.employeeCode, companyId, status: 'ACTIVE', allowKiosk: true },
        include: { workCenter: { select: { id: true, name: true } } },
      });
      if (!employee) throw new UnauthorizedException('Empleado no encontrado');
    } else if (dto.method === ClockMethod.QR_CODE) {
      if (!dto.qrToken) throw new BadRequestException('Token QR requerido');
      const credential = await this.prisma.employeeCredential.findFirst({
        where: { method: ClockMethod.QR_CODE, secret: dto.qrToken, isActive: true },
        include: {
          employee: { include: { workCenter: { select: { id: true, name: true } } } },
        },
      });
      if (!credential) throw new UnauthorizedException('QR inválido o expirado');
      if (credential.employee.companyId !== companyId) throw new UnauthorizedException('QR inválido');
      if (!credential.employee.allowKiosk) {
        throw new ForbiddenException('Kiosco no permitido para este empleado');
      }
      employee = credential.employee;
      await this.prisma.employeeCredential.update({
        where: { id: credential.id },
        data: { lastUsed: new Date() },
      });
    } else {
      throw new BadRequestException('Método de identificación no soportado en kiosco');
    }

    const currentStatus = await this.timeEntriesService.getCurrentStatus(employee.id);

    return {
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      workCenterId: employee.workCenterId,
      workCenterName: employee.workCenter?.name,
      currentStatus: currentStatus.status,
      lastEntry: currentStatus.lastEntry
        ? { type: currentStatus.lastEntry.type, timestamp: currentStatus.lastEntry.timestamp }
        : null,
    };
  }

  /**
   * STEP 2: Perform clock action after identification
   */
  async performClock(
    dto: KioskClockDto,
    companyId: string,
    meta: { ip: string; userAgent: string },
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId, status: 'ACTIVE', allowKiosk: true },
    });

    if (!employee) throw new NotFoundException('Empleado no encontrado o no autorizado');

    const clockDto = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      workCenterId: dto.workCenterId ?? employee.workCenterId ?? undefined,
      notes: dto.notes,
      deviceType: DeviceType.KIOSK,
      deviceId: dto.deviceId,
      clockMethod: (dto.identificationMethod ?? ClockMethod.PIN) as any,
    };

    let result: any;

    switch (dto.type) {
      case TimeEntryType.CHECK_IN:
        result = await this.timeEntriesService.clockIn(employee.id, companyId, clockDto, meta);
        break;
      case TimeEntryType.CHECK_OUT:
        result = await this.timeEntriesService.clockOut(employee.id, companyId, clockDto, meta);
        break;
      case TimeEntryType.BREAK_START:
        result = await this.timeEntriesService.breakStart(employee.id, companyId, clockDto, meta);
        break;
      case TimeEntryType.BREAK_END:
        result = await this.timeEntriesService.breakEnd(employee.id, companyId, clockDto, meta);
        break;
      default:
        throw new BadRequestException('Tipo de fichaje no válido');
    }

    return {
      success: true,
      type: dto.type,
      employeeId: employee.id,
      firstName: employee.firstName,
      timestamp: result.timestamp,
      status: result.status,
      isWithinZone: result.isWithinZone,
    };
  }

  async getEmployeeList(companyId: string, workCenterId?: string) {
    return this.prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        allowKiosk: true,
        ...(workCenterId ? { workCenterId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        department: true,
        allowedMethods: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }
}
