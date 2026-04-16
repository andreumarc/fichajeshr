import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user!.sub, isActive: true },
      include: { company: true, employee: { include: { workCenter: true } } },
    });

    if (!dbUser) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    const { passwordHash, ...safeUser } = dbUser as any;
    return NextResponse.json(safeUser);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
