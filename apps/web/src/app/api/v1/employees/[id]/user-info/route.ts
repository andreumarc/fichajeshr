import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const emp = await prisma.employee.findFirst({
      where: { id: params.id, companyId: user!.companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            mustChangePassword: true,
            lastLogin: true,
          },
        },
      },
    });
    if (!emp) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    return NextResponse.json({ hasUser: !!emp.user, user: emp.user });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
