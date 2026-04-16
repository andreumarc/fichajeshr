import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import * as bcrypt from 'bcryptjs';
import { AuditAction } from '@prisma/client';

export async function PATCH(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'currentPassword and newPassword are required' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ message: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user!.sub } });
    if (!dbUser) return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 401 });

    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValid) return NextResponse.json({ message: 'Contrasena actual incorrecta' }, { status: 401 });

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user!.sub },
      data: { passwordHash: newHash },
    });

    await auditLog({
      companyId: dbUser.companyId ?? '',
      userId: dbUser.id,
      action: AuditAction.PASSWORD_RESET,
      entityType: 'User',
      entityId: dbUser.id,
      description: 'Cambio de contrasena por el usuario',
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
