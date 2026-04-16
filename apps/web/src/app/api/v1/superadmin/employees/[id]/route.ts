import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const emp = await prisma.employee.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!emp) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });

    await prisma.timeEntry.deleteMany({ where: { employeeId: params.id } });
    await prisma.employee.update({
      where: { id: params.id },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
