import { prisma } from './db';
import { auditLog } from './audit';
import { checkGeofence } from './geofence';
import { TimeEntryType, TimeEntryStatus, IncidentType, AuditAction, DeviceType } from '@prisma/client';
import dayjs from 'dayjs';

export async function getLastEntry(employeeId: string) {
  const today = dayjs().startOf('day').toDate();
  return prisma.timeEntry.findFirst({
    where: { employeeId, timestamp: { gte: today } },
    orderBy: { timestamp: 'desc' },
  });
}

export async function createTimeEntry(
  employeeId: string,
  companyId: string,
  dto: any,
  type: TimeEntryType,
  meta: { ip: string; userAgent: string },
) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { workCenter: true, company: true },
  });
  if (!employee) throw new Error('Empleado no encontrado');

  const workCenterId = dto.workCenterId ?? employee.workCenterId ?? undefined;
  const workCenter = workCenterId
    ? await prisma.workCenter.findUnique({ where: { id: workCenterId } })
    : null;

  let status: TimeEntryStatus = TimeEntryStatus.VALID;
  let distanceToCenter: number | undefined;
  let isWithinZone: boolean | undefined;
  let geofenceRuleId: string | undefined;

  if (dto.latitude && dto.longitude && workCenter?.latitude && workCenter?.longitude) {
    const geofenceRule = await prisma.geofenceRule.findFirst({
      where: { workCenterId, isActive: true },
    });

    const radiusMeters = geofenceRule?.radiusMeters ?? workCenter.radiusMeters ?? 200;
    const toleranceMeters = geofenceRule?.toleranceMeters ?? 50;

    const check = checkGeofence(
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
      await prisma.incident.create({
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

  const entry = await prisma.timeEntry.create({
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

  await auditLog({
    action: AuditAction.CLOCK_IN,
    entityType: 'TimeEntry',
    entityId: entry.id,
    companyId,
    after: entry,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    description: `${type} registered for employee ${employeeId}. Status: ${status}`,
  });

  return entry;
}

export function calculateWorkedHours(entries: any[]) {
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
