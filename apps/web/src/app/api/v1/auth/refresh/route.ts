import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signAccess, signRefresh } from '@/lib/jwt';
import { getMeta } from '@/lib/api-auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;
    const meta = getMeta(req);

    if (!refreshToken) {
      return NextResponse.json({ message: 'refreshToken es obligatorio' }, { status: 400 });
    }

    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: { include: { company: true, employee: true } } },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      return NextResponse.json({ message: 'Sesion invalida o expirada' }, { status: 401 });
    }

    const payload = {
      sub: session.user.id,
      email: session.user.email,
      role: session.user.role,
      companyId: session.user.companyId,
      employeeId: session.user.employeeId,
    };

    const newAccessToken = signAccess(payload);
    const newRefreshToken = signRefresh({ sub: session.user.id, jti: uuidv4() });

    // Rotate refresh token
    await prisma.userSession.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, isRevoked: false },
    });

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
