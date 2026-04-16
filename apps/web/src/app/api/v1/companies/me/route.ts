import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN']);
  if (error) return error;

  try {
    const company = await prisma.company.findUnique({
      where: { id: user!.companyId! },
      include: {
        workCenters: { where: { deletedAt: null } },
        _count: { select: { employees: true } },
      },
    });
    if (!company) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });
    return NextResponse.json(company);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const updated = await prisma.company.update({
      where: { id: user!.companyId! },
      data: dto,
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
