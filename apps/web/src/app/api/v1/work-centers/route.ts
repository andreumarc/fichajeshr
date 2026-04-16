import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const data = await prisma.workCenter.findMany({
      where: { companyId: user!.companyId, deletedAt: null },
      include: {
        _count: { select: { employees: true } },
        geofenceRules: { where: { isActive: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.companyId!;

    const center = await prisma.workCenter.create({
      data: { ...dto, companyId, createdBy: user!.sub },
    });

    if (dto.latitude && dto.longitude) {
      await prisma.geofenceRule.create({
        data: {
          companyId,
          workCenterId: center.id,
          name: `${center.name} - Geofence`,
          latitude: dto.latitude,
          longitude: dto.longitude,
          radiusMeters: dto.radiusMeters ?? 200,
          toleranceMeters: 50,
          createdBy: user!.sub,
        },
      });
    }

    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'WorkCenter',
      entityId: center.id,
      userId: user!.sub,
      companyId,
      after: center,
      description: `Work center ${center.name} created`,
    });

    return NextResponse.json(center, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
