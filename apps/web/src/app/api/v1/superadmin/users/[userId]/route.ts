import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, { params }: { params: { userId: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const dbUser = await prisma.user.findUnique({ where: { id: params.userId } });
    if (!dbUser) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { isActive: false },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true,
      },
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
