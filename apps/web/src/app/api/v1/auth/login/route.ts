import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { signAccess, signRefresh, parseExpiry } from '@/lib/jwt';
import { auditLog } from '@/lib/audit';
import { getMeta } from '@/lib/api-auth';
import * as bcrypt from 'bcryptjs';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, deviceInfo } = body;
    const meta = getMeta(req);

    if (!email || !password) {
      return NextResponse.json({ message: 'Email y contraseña son obligatorios' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true, employee: { include: { workCenter: true } } },
    });

    if (!user) {
      await auditLog({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        description: `Login failed: email not found (${email})`,
      });
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        { message: `Cuenta bloqueada hasta ${user.lockedUntil.toISOString()}. Demasiados intentos fallidos.` },
        { status: 403 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'Cuenta desactivada' }, { status: 403 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = user.loginAttempts + 1;
      const lockData: any = { loginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        lockData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }
      await prisma.user.update({ where: { id: user.id }, data: lockData });

      await auditLog({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        companyId: user.companyId ?? undefined,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        description: `Login failed: invalid password (attempt ${attempts})`,
      });
      return NextResponse.json({ message: 'Credenciales inválidas' }, { status: 401 });
    }

    // Reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employeeId,
    };

    const accessToken = signAccess(payload);
    const refreshToken = signRefresh({ sub: user.id, jti: uuidv4() });

    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

    // Save session
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        deviceInfo: deviceInfo ?? null,
        expiresAt: new Date(Date.now() + parseExpiry(refreshExpiresIn)),
      },
    });

    await auditLog({
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      companyId: user.companyId ?? undefined,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      description: 'User logged in',
    });

    // Sanitize user
    const { passwordHash, ...safeUser } = user as any;

    return NextResponse.json({
      accessToken,
      refreshToken,
      user: safeUser,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
