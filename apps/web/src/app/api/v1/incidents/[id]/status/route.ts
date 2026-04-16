import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction, IncidentStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN', 'COMPANY_ADMIN', 'HR']);
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.companyId!;

    const incident = await prisma.incident.findFirst({ where: { id: params.id, companyId } });
    if (!incident) return NextResponse.json({ message: 'Incidencia no encontrada' }, { status: 404 });

    const before = { ...incident };
    const updated = await prisma.incident.update({
      where: { id: params.id },
      data: {
        status: dto.status as IncidentStatus,
        resolution: dto.resolution ?? incident.resolution,
        resolvedAt: ['RESOLVED', 'REJECTED'].includes(dto.status) ? new Date() : null,
        resolvedBy: ['RESOLVED', 'REJECTED'].includes(dto.status) ? user!.sub : null,
      },
      include: {
        employee: { select: { firstName: true, lastName: true, employeeCode: true } },
      },
    });

    await auditLog({
      action: AuditAction.UPDATE,
      entityType: 'Incident',
      entityId: params.id,
      userId: user!.sub,
      companyId,
      before,
      after: updated,
      description: `Incident status updated to ${dto.status} by ${user!.sub}`,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
