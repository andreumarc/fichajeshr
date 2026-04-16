import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const center = await prisma.workCenter.findFirst({
      where: { id: params.id, companyId: user!.companyId, deletedAt: null },
      include: {
        employees: { where: { status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true } },
        geofenceRules: true,
      },
    });
    if (!center) return NextResponse.json({ message: 'Centro no encontrado' }, { status: 404 });
    return NextResponse.json(center);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const center = await prisma.workCenter.findFirst({
      where: { id: params.id, companyId, deletedAt: null },
    });
    if (!center) return NextResponse.json({ message: 'Centro no encontrado' }, { status: 404 });

    const dto = await req.json();
    const before = { ...center };
    const updated = await prisma.workCenter.update({
      where: { id: params.id },
      data: { ...dto, updatedBy: user!.sub },
    });

    await auditLog({
      action: AuditAction.UPDATE,
      entityType: 'WorkCenter',
      entityId: params.id,
      userId: user!.sub,
      companyId,
      before,
      after: updated,
      description: `Work center ${updated.name} updated`,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const center = await prisma.workCenter.findFirst({
      where: { id: params.id, companyId, deletedAt: null },
    });
    if (!center) return NextResponse.json({ message: 'Centro no encontrado' }, { status: 404 });

    await prisma.workCenter.update({
      where: { id: params.id },
      data: { isActive: false, deletedAt: new Date(), updatedBy: user!.sub },
    });

    await auditLog({
      action: AuditAction.DELETE,
      entityType: 'WorkCenter',
      entityId: params.id,
      userId: user!.sub,
      companyId,
      description: `Work center ${center.name} deactivated`,
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
