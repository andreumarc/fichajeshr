import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true, email: true, firstName: true, lastName: true,
            role: true, isActive: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { employees: true, workCenters: true } },
      },
    });
    if (!company) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });
    return NextResponse.json(company);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const company = await prisma.company.findUnique({ where: { id: params.id } });
    if (!company) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });

    const dto = await req.json();
    const updated = await prisma.company.update({ where: { id: params.id }, data: dto });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const company = await prisma.company.findUnique({ where: { id: params.id } });
    if (!company) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });

    await prisma.timeEntry.deleteMany({ where: { companyId: params.id } });
    await prisma.employee.updateMany({
      where: { companyId: params.id, deletedAt: null },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });
    const result = await prisma.company.update({
      where: { id: params.id },
      data: { isActive: false, deletedAt: new Date() },
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
