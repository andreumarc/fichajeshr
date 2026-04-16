import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ message: 'Minimo 8 caracteres' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user!.sub } });
    if (!dbUser) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 401 });
    if (!dbUser.mustChangePassword) {
      return NextResponse.json({ message: 'No se requiere cambio de contrasena' }, { status: 403 });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user!.sub },
      data: { passwordHash: hash, mustChangePassword: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
