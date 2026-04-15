import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DayOfWeek, ScheduleType } from '@prisma/client';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  // ── Schedule templates ──────────────────────────────────────

  findAll(companyId: string) {
    return this.prisma.workSchedule.findMany({
      where: { companyId, deletedAt: null },
      include: { days: true, _count: { select: { assignments: { where: { isActive: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, companyId: string) {
    return this.prisma.workSchedule.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        days: true,
        assignments: {
          where: { isActive: true },
          include: {
            employee: {
              select: { id: true, fullName: true, employeeCode: true, department: true },
            },
          },
        },
      },
    });
  }

  async create(
    companyId: string,
    dto: {
      name: string;
      type: ScheduleType;
      description?: string;
      weeklyHours: number;
      annualHours?: number;
      days: {
        dayOfWeek: DayOfWeek;
        isWorkDay: boolean;
        startTime?: string;
        endTime?: string;
        breakMinutes?: number;
        startTime2?: string;
        endTime2?: string;
      }[];
    },
    userId: string,
  ) {
    const { days, ...scheduleData } = dto;
    return this.prisma.workSchedule.create({
      data: {
        ...scheduleData,
        companyId,
        createdBy: userId,
        days: { create: days },
      },
      include: { days: true },
    });
  }

  async update(
    id: string,
    companyId: string,
    dto: {
      name?: string;
      description?: string;
      weeklyHours?: number;
      annualHours?: number;
      days?: any[];
    },
  ) {
    const schedule = await this.prisma.workSchedule.findFirst({ where: { id, companyId } });
    if (!schedule) throw new NotFoundException('Horario no encontrado');

    const { days, ...rest } = dto;
    if (days) {
      await this.prisma.workScheduleDay.deleteMany({ where: { scheduleId: id } });
    }
    return this.prisma.workSchedule.update({
      where: { id },
      data: { ...rest, ...(days ? { days: { create: days } } : {}) },
      include: { days: true },
    });
  }

  async delete(id: string, companyId: string) {
    const schedule = await this.prisma.workSchedule.findFirst({ where: { id, companyId } });
    if (!schedule) throw new NotFoundException('Horario no encontrado');
    return this.prisma.workSchedule.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ── Employee assignments ────────────────────────────────────

  async assignToEmployee(
    companyId: string,
    employeeId: string,
    scheduleId: string,
    startDate: string,
    endDate?: string,
    userId?: string,
  ) {
    // Deactivate previous active assignment
    await this.prisma.employeeSchedule.updateMany({
      where: { employeeId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.employeeSchedule.create({
      data: {
        employeeId,
        scheduleId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
        createdBy: userId,
      },
      include: { schedule: { include: { days: true } } },
    });
  }

  getEmployeeSchedule(employeeId: string) {
    return this.prisma.employeeSchedule.findFirst({
      where: { employeeId, isActive: true },
      include: { schedule: { include: { days: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── All employees with their schedule (for HR view) ─────────
  async getCompanyEmployeesWithSchedules(companyId: string) {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        department: true,
        weeklyHours: true,
        status: true,
        schedules: {
          where: { isActive: true },
          include: { schedule: { include: { days: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });
    return employees;
  }

  // ── Schedule compliance check for a given day ───────────────
  async getEmployeeTodayCompliance(employeeId: string) {
    const assignment = await this.getEmployeeSchedule(employeeId);
    if (!assignment) return { hasSchedule: false };

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayDow = days[new Date().getDay()] as DayOfWeek;
    const scheduleDay = assignment.schedule.days.find((d) => d.dayOfWeek === todayDow);

    return {
      hasSchedule: true,
      scheduleName: assignment.schedule.name,
      scheduleType: assignment.schedule.type,
      today: scheduleDay ?? null,
      weeklyHours: assignment.schedule.weeklyHours,
      annualHours: assignment.schedule.annualHours,
    };
  }
}
