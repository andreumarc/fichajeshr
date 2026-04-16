import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { calculateWorkedHours } from '@/lib/time-entries-helpers';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

// This single route handles multiple sub-paths via query params:
// GET /reports?type=dashboard
// GET /reports?type=monthly-summary&year=...&month=...
// GET /reports?type=incidents&from=...&to=...
// GET /reports?type=export-excel&from=...&to=...
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? 'dashboard';
    const companyId = user!.companyId!;

    if (type === 'dashboard') {
      const today = dayjs().startOf('day').toDate();
      const weekStart = dayjs().startOf('week').toDate();

      const [totalEmployees, activeToday, clockedInNow, onBreakNow, outOfZoneToday, openIncidents, weeklyEntries] =
        await Promise.all([
          prisma.employee.count({ where: { companyId, status: 'ACTIVE', deletedAt: null } }),
          prisma.timeEntry.groupBy({
            by: ['employeeId'],
            where: { companyId, timestamp: { gte: today } },
            _count: { employeeId: true },
          }),
          prisma.timeEntry.findMany({
            where: { companyId, type: 'CHECK_IN', timestamp: { gte: today } },
            distinct: ['employeeId'],
            orderBy: { timestamp: 'desc' },
          }),
          prisma.timeEntry.findMany({
            where: { companyId, type: 'BREAK_START', timestamp: { gte: today } },
            distinct: ['employeeId'],
            orderBy: { timestamp: 'desc' },
          }),
          prisma.timeEntry.count({
            where: { companyId, isWithinZone: false, timestamp: { gte: today } },
          }),
          prisma.incident.count({ where: { companyId, status: 'OPEN' } }),
          prisma.timeEntry.count({ where: { companyId, timestamp: { gte: weekStart } } }),
        ]);

      return NextResponse.json({
        totalEmployees,
        activeToday: activeToday.length,
        clockedInNow: clockedInNow.length,
        onBreakNow: onBreakNow.length,
        notClockedIn: totalEmployees - activeToday.length,
        outOfZoneToday,
        openIncidents,
        weeklyEntries,
      });
    }

    if (type === 'monthly-summary') {
      const year = parseInt(url.searchParams.get('year') ?? String(new Date().getFullYear()));
      const month = parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1));
      const employeeId = url.searchParams.get('employeeId');

      const from = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').toDate();
      const to = dayjs(from).endOf('month').toDate();

      const where: any = { companyId, timestamp: { gte: from, lte: to } };
      if (employeeId) where.employeeId = employeeId;

      const entries = await prisma.timeEntry.findMany({
        where,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
          workCenter: { select: { name: true } },
        },
        orderBy: { timestamp: 'asc' },
      });

      const byEmployee: Record<string, any> = {};
      for (const entry of entries) {
        const empId = entry.employeeId;
        const day = dayjs(entry.timestamp).format('YYYY-MM-DD');
        if (!byEmployee[empId]) {
          byEmployee[empId] = { employee: entry.employee, days: {} };
        }
        if (!byEmployee[empId].days[day]) byEmployee[empId].days[day] = [];
        byEmployee[empId].days[day].push(entry);
      }

      const results = [];
      for (const [_, data] of Object.entries(byEmployee) as any[]) {
        let totalWorkedMin = 0;
        let totalBreakMin = 0;
        const dailySummaries = [];

        for (const [day, dayEntries] of Object.entries(data.days) as any[]) {
          const summary = calculateWorkedHours(dayEntries);
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

      return NextResponse.json(results);
    }

    if (type === 'incidents') {
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const where: any = { companyId };
      if (from || to) {
        where.occurredAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        };
      }

      const data = await prisma.incident.findMany({
        where,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
        },
        orderBy: { occurredAt: 'desc' },
      });

      return NextResponse.json(data);
    }

    if (type === 'export-excel') {
      const from = url.searchParams.get('from')!;
      const to = url.searchParams.get('to')!;

      const entries = await prisma.timeEntry.findMany({
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
        'Codigo Empleado': e.employee?.employeeCode,
        'Nombre': `${e.employee?.firstName} ${e.employee?.lastName}`,
        'Tipo': e.type,
        'Fecha/Hora': dayjs(e.timestamp).format('YYYY-MM-DD HH:mm:ss'),
        'Centro': e.workCenter?.name ?? '',
        'Estado': e.status,
        'Latitud': e.latitude ?? '',
        'Longitud': e.longitude ?? '',
        'Distancia (m)': e.distanceToCenter ?? '',
        'Dentro de zona': e.isWithinZone === null ? '' : e.isWithinZone ? 'Si' : 'No',
        'Dispositivo': e.deviceType,
        'Metodo': e.clockMethod,
        'IP': e.ipAddress ?? '',
        'Manual': e.isManual ? 'Si' : 'No',
        'Notas': e.notes ?? '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fichajes');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      const filename = `fichajes_${from}_${to}.xlsx`;

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ message: 'Tipo de reporte no valido' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
