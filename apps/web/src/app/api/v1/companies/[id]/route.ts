import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN', 'COMPANY_ADMIN']);
  if (error) return error;

  try {
    const company = await prisma.company.findUnique({
      where: { id: params.id },
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN', 'COMPANY_ADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.role === 'SUPERADMIN' ? params.id : user!.companyId!;
    const updated = await prisma.company.update({ where: { id: companyId }, data: dto });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    await prisma.company.update({
      where: { id: params.id },
      data: { isActive: false, deletedAt: new Date() },
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
