import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction, IncidentStatus, IncidentType } from '@prisma/client';

// GET: Admin/HR get all incidents
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');
    const status = url.searchParams.get('status') as IncidentStatus | null;
    const type = url.searchParams.get('type') as IncidentType | null;
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const skip = (page - 1) * limit;

    const where: any = { companyId: user!.companyId };
    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (from || to) {
      where.occurredAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
        include: {
          employee: { select: { firstName: true, lastName: true, employeeCode: true } },
          timeEntry: { select: { type: true, timestamp: true } },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Admin/HR creates incident for any employee
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN', 'COMPANY_ADMIN', 'HR']);
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.companyId!;

    if (dto.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: { id: dto.employeeId, companyId, deletedAt: null },
      });
      if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    }

    const employeeId = dto.employeeId ?? user!.employeeId;
    const incident = await prisma.incident.create({
      data: {
        companyId,
        employeeId,
        type: dto.type,
        description: dto.description,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        timeEntryId: dto.timeEntryId ?? null,
        status: IncidentStatus.OPEN,
        createdBy: user!.sub,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    });

    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'Incident',
      entityId: incident.id,
      userId: user!.sub,
      companyId,
      after: incident,
      description: `Incident created: ${dto.type}`,
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
