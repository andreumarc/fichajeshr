import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeEntriesService } from '../time-entries/time-entries.service';
import * as dayjs from 'dayjs';
import * as XLSX from 'xlsx';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private timeEntriesService: TimeEntriesService,
  ) {}

  async getDashboardStats(companyId: string) {
    const today = dayjs().startOf('day').toDate();
    const weekStart = dayjs().startOf('week').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      totalEmployees,
      activeToday,
      clockedInNow,
      onBreakNow,
      outOfZoneToday,
      openIncidents,
      weeklyEntries,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { companyId, status: 'ACTIVE', deletedAt: null } }),

      this.prisma.timeEntry.groupBy({
        by: ['employeeId'],
        where: { companyId, timestamp: { gte: today } },
        _count: { employeeId: true },
      }),

      this.prisma.timeEntry.findMany({
        where: { companyId, type: 'CHECK_IN', timestamp: { gte: today } },
        distinct: ['employeeId'],
        orderBy: { timestamp: 'desc' },
      }),

      this.prisma.timeEntry.findMany({
        where: { companyId, type: 'BREAK_START', timestamp: { gte: today } },
        distinct: ['employeeId'],
        orderBy: { timestamp: 'desc' },
      }),

      this.prisma.timeEntry.count({
        where: { companyId, isWithinZone: false, timestamp: { gte: today } },
      }),

      this.prisma.incident.count({
        where: { companyId, status: 'OPEN' },
      }),

      this.prisma.timeEntry.count({
        where: { companyId, timestamp: { gte: weekStart } },
      }),
    ]);

    // Employees who haven't clocked in today
    const clockedInIds = new Set(clockedInNow.map((e) => e.employeeId));

    return {
      totalEmployees,
      activeToday: activeToday.length,
      clockedInNow: clockedInNow.length,
      onBreakNow: onBreakNow.length,
      notClockedIn: totalEmployees - activeToday.length,
      outOfZoneToday,
      openIncidents,
      weeklyEntries,
    };
  }

  async getMonthlySummary(
    companyId: string,
    year: number,
    month: number,
    employeeId?: string,
  ) {
    const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
    const to = dayjs(from).endOf('month').toDate();

    const where: any = { companyId, timestamp: { gte: from, lte: to } };
    if (employeeId) where.employeeId = employeeId;

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        workCenter: { select: { name: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Group by employee and by day
    const byEmployee: Record<string, any> = {};

    for (const entry of entries) {
      const empId = entry.employeeId;
      const day = dayjs(entry.timestamp).format('YYYY-MM-DD');

      if (!byEmployee[empId]) {
        byEmployee[empId] = {
          employee: entry.employee,
          days: {},
          totalWorkedMinutes: 0,
          totalBreakMinutes: 0,
        };
      }

      if (!byEmployee[empId].days[day]) {
        byEmployee[empId].days[day] = [];
      }

      byEmployee[empId].days[day].push(entry);
    }

    // Calculate worked hours per employee
    const results = [];
    for (const [empId, data] of Object.entries(byEmployee) as any[]) {
      let totalWorkedMin = 0;
      let totalBreakMin = 0;
      const dailySummaries = [];

      for (const [day, dayEntries] of Object.entries(data.days) as any[]) {
        const summary = this.timeEntriesService.calculateWorkedHours(dayEntries);
        totalWorkedMin += summary.netWorkedMinutes;
        totalBreakMin += summary.totalBreakMinutes;
        dailySummaries.push({ date: day, ...summary });
      }

      results.push({
        employee: data.employee,
        totalWorkedMinutes: totalWorkedMin,
        totalWorkedHours: (totalWorkedMin / 60).toFixed(2),
        totalBreakMinutes: totalBreakMin,
        workDays: Object.keys(data.days).length,
        dailySummaries,
      });
    }

    return results;
  }

  async exportToExcel(companyId: string, from: string, to: string): Promise<Buffer> {
    const entries = await this.prisma.timeEntry.findMany({
      where: {
        companyId,
        timestamp: { gte: new Date(from), lte: new Date(to) },
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        workCenter: { select: { name: true } },
      },
      orderBy: [{ employeeId: 'asc' }, { timestamp: 'asc' }],
    });

    const rows = entries.map((e) => ({
      'Código Empleado': e.employee?.employeeCode,
      'Nombre': `${e.employee?.firstName} ${e.employee?.lastName}`,
      'Tipo': e.type,
      'Fecha/Hora': dayjs(e.timestamp).format('YYYY-MM-DD HH:mm:ss'),
      'Centro': e.workCenter?.name ?? '',
      'Estado': e.status,
      'Latitud': e.latitude ?? '',
      'Longitud': e.longitude ?? '',
      'Distancia (m)': e.distanceToCenter ?? '',
      'Dentro de zona': e.isWithinZone === null ? '' : e.isWithinZone ? 'Sí' : 'No',
      'Dispositivo': e.deviceType,
      'Método': e.clockMethod,
      'IP': e.ipAddress ?? '',
      'Manual': e.isManual ? 'Sí' : 'No',
      'Notas': e.notes ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fichajes');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  async getIncidentsSummary(companyId: string, from?: string, to?: string) {
    const where: any = { companyId };
    if (from || to) {
      where.occurredAt = {
        gte: from ? new Date(from) : undefined,
        lte: to ? new Date(to) : undefined,
      };
    }

    return this.prisma.incident.findMany({
      where,
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }
}
