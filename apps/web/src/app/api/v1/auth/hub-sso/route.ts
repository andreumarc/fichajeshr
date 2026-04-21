import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'
import { signAccess, signRefresh, parseExpiry } from '@/lib/jwt'
import { auditLog } from '@/lib/audit'
import { getMeta } from '@/lib/api-auth'
import { AuditAction, UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'

const ROLE_MAP: Record<string, UserRole> = {
  superadmin:        UserRole.SUPERADMIN,
  admin:             UserRole.ADMIN,
  company_admin:     UserRole.ADMIN,
  direccion_general: UserRole.DIRECCION_GENERAL,
  direccion_clinica: UserRole.DIRECCION_CLINICA,
  hr:                UserRole.RRHH,
  rrhh:              UserRole.RRHH,
  manager:           UserRole.DIRECCION_CLINICA,
  odontologo:        UserRole.ODONTOLOGO,
  auxiliar:          UserRole.AUXILIAR,
  employee:          UserRole.AUXILIAR,
  kiosk:             UserRole.KIOSK,
}

export async function GET(req: NextRequest) {
  const hubToken = req.nextUrl.searchParams.get('hub_token')
  if (!hubToken) {
    return NextResponse.json({ message: 'hub_token requerido' }, { status: 400 })
  }

  const secret = process.env.HUB_JWT_SECRET
  if (!secret) {
    return NextResponse.json({ message: 'SSO no configurado' }, { status: 500 })
  }

  let email: string, name: string, appRole: string
  try {
    const { payload } = await jwtVerify(hubToken, new TextEncoder().encode(secret), {
      issuer: 'impulsodent-hub',
    })
    email = payload['email'] as string
    name = (payload['name'] as string) ?? ''
    appRole = (payload['app_role'] as string) ?? 'employee'
    if (!email) throw new Error('no email')
  } catch {
    return NextResponse.json({ message: 'Token inválido o expirado' }, { status: 401 })
  }

  const role: UserRole = ROLE_MAP[appRole.toLowerCase()] ?? UserRole.AUXILIAR
  const parts = name.trim().split(' ')
  const firstName = parts[0] ?? ''
  const lastName = parts.slice(1).join(' ')

  const meta = getMeta(req)

  try {
    let user = await prisma.user.findUnique({
      where: { email },
      include: { company: true, employee: { include: { workCenter: true } } },
    })

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString('hex')
      const passwordHash = await bcrypt.hash(randomPassword, 10)
      const created = await prisma.user.create({
        data: { email, firstName, lastName, passwordHash, role, isActive: true },
      })
      user = await prisma.user.findUnique({
        where: { id: created.id },
        include: { company: true, employee: { include: { workCenter: true } } },
      })
    }

    if (!user) {
      return NextResponse.json({ message: 'Error creando usuario' }, { status: 500 })
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'Cuenta desactivada' }, { status: 403 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    })

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employeeId,
    }

    const accessToken = signAccess(payload)
    const refreshToken = signRefresh({ sub: user.id, jti: uuidv4() })

    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        deviceInfo: null,
        expiresAt: new Date(Date.now() + parseExpiry(refreshExpiresIn)),
      },
    })

    await auditLog({
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      companyId: user.companyId ?? undefined,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      description: 'User logged in via Hub SSO',
    })

    const { passwordHash: _, ...safeUser } = user as any

    return NextResponse.json({
      data: { accessToken, refreshToken, user: safeUser },
    })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
