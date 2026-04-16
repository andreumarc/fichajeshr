import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (refreshToken) {
      await prisma.userSession.updateMany({
        where: { userId: user!.sub, refreshToken },
        data: { isRevoked: true },
      });
    } else {
      // Logout all sessions
      await prisma.userSession.updateMany({
        where: { userId: user!.sub },
        data: { isRevoked: true },
      });
    }

    await auditLog({
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: user!.sub,
      userId: user!.sub,
      description: 'User logged out',
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
