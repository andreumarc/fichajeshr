import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaveType, LeaveStatus } from '@prisma/client';

@Injectable()
export class LeaveRequestsService {
  constructor(private prisma: PrismaService) {}

  // ── Employee creates request ────────────────────────────────
  async create(
    companyId: string,
    employeeId: string,
    dto: {
      type: LeaveType;
      startDate: string;
      endDate: string;
      reason?: string;
    },
  ) {
    const days = this.businessDays(new Date(dto.startDate), new Date(dto.endDate));
    if (days <= 0) throw new BadRequestException('Las fechas no son válidas');

    // Check overlapping
    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        deletedAt: null,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: new Date(dto.endDate) },
        endDate: { gte: new Date(dto.startDate) },
      },
    });
    if (overlap) throw new BadRequestException('Ya existe una solicitud para ese período');

    return this.prisma.leaveRequest.create({
      data: {
        companyId,
        employeeId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        reason: dto.reason,
        status: dto.type === LeaveType.SICK_LEAVE ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
      },
      include: { employee: { select: { fullName: true } } },
    });
  }

  // ── HR lists all requests ───────────────────────────────────
  findAll(
    companyId: string,
    filters?: { status?: LeaveStatus; type?: LeaveType; employeeId?: string },
  ) {
    return this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.employeeId && { employeeId: filters.employeeId }),
      },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeCode: true, department: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Employee lists own requests ─────────────────────────────
  findMyRequests(employeeId: string) {
    return this.prisma.leaveRequest.findMany({
      where: { employeeId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── HR reviews ─────────────────────────────────────────────
  async review(
    id: string,
    companyId: string,
    reviewerId: string,
    action: 'approve' | 'reject',
    hrNotes?: string,
  ) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status !== LeaveStatus.PENDING)
      throw new BadRequestException('La solicitud ya fue procesada');

    const newStatus = action === 'approve' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: newStatus, reviewedBy: reviewerId, reviewedAt: new Date(), hrNotes },
      include: { employee: { select: { fullName: true } } },
    });

    // Update balance if approved vacation/personal
    if (newStatus === LeaveStatus.APPROVED) {
      const year = new Date(request.startDate).getFullYear();
      let balance = await this.prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: request.employeeId, year } },
      });
      if (!balance) {
        balance = await this.prisma.leaveBalance.create({
          data: { companyId, employeeId: request.employeeId, year },
        });
      }
      if (request.type === 'VACATION') {
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { vacationUsed: { increment: request.days } },
        });
      } else if (request.type === 'PERSONAL_DAY') {
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { personalUsed: { increment: request.days } },
        });
      }
    }

    return updated;
  }

  // ── Employee cancels ────────────────────────────────────────
  async cancel(id: string, employeeId: string) {
    const request = await this.prisma.leaveRequest.findFirst({
      where: { id, employeeId, deletedAt: null },
    });
    if (!request) throw new NotFoundException('Solicitud no encontrada');
    if (request.status === LeaveStatus.APPROVED)
      throw new BadRequestException('No se puede cancelar una solicitud aprobada');
    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: LeaveStatus.CANCELLED },
    });
  }

  // ── Balance ─────────────────────────────────────────────────
  async getBalance(employeeId: string, year?: number) {
    const y = year ?? new Date().getFullYear();
    let balance = await this.prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId, year: y } },
    });
    if (!balance) {
      const emp = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      });
      balance = await this.prisma.leaveBalance.create({
        data: { companyId: emp!.companyId, employeeId, year: y },
      });
    }
    return balance;
  }

  // ── HR adds sick leave ──────────────────────────────────────
  async createSickLeave(
    companyId: string,
    dto: { employeeId: string; startDate: string; endDate: string; reason?: string },
  ) {
    const days = this.businessDays(new Date(dto.startDate), new Date(dto.endDate));
    return this.prisma.leaveRequest.create({
      data: {
        companyId,
        employeeId: dto.employeeId,
        type: LeaveType.SICK_LEAVE,
        status: LeaveStatus.APPROVED,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        reason: dto.reason,
      },
      include: { employee: { select: { fullName: true } } },
    });
  }

  // ── Stats for HR dashboard ──────────────────────────────────
  async getStats(companyId: string) {
    const now = new Date();
    const [pending, approvedThisMonth, sickLeaveActive] = await Promise.all([
      this.prisma.leaveRequest.count({
        where: { companyId, status: LeaveStatus.PENDING, deletedAt: null },
      }),
      this.prisma.leaveRequest.count({
        where: {
          companyId,
          status: LeaveStatus.APPROVED,
          deletedAt: null,
          startDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }),
      this.prisma.leaveRequest.count({
        where: {
          companyId,
          type: LeaveType.SICK_LEAVE,
          status: LeaveStatus.APPROVED,
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
    ]);
    return { pending, approvedThisMonth, sickLeaveActive };
  }

  // ── Helper: business days between two dates ─────────────────
  private businessDays(start: Date, end: Date): number {
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
}
