import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction, IncidentStatus } from '@prisma/client';

// GET: Employee's own incidents
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as IncidentStatus | null;
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '25');
    const skip = (page - 1) * limit;

    const where: any = { employeeId: user!.employeeId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
        include: { timeEntry: { select: { type: true, timestamp: true } } },
      }),
      prisma.incident.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Employee creates own incident
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.companyId!;
    const employeeId = user!.employeeId!;

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
      description: `Incident created by employee ${employeeId}: ${dto.type}`,
    });

    return NextResponse.json(incident, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
