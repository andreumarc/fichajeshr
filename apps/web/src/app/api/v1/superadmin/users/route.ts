import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { not: 'SUPERADMIN' },
      },
      include: {
        company: { select: { id: true, name: true } },
        employee: { select: { id: true, fullName: true, employeeCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(users);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('id');
    if (!userId) return NextResponse.json({ message: 'id requerido' }, { status: 400 });

    const body = await req.json();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: body.isActive },
      select: { id: true, email: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
