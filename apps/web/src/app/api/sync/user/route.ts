import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

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

function splitName(full?: string): { firstName: string; lastName: string } {
  const s = (full ?? '').trim()
  if (!s) return { firstName: '', lastName: '' }
  const idx = s.indexOf(' ')
  if (idx === -1) return { firstName: s, lastName: '' }
  return { firstName: s.slice(0, idx), lastName: s.slice(idx + 1).trim() }
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = process.env.HUB_JWT_SECRET ?? process.env.JWT_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    email,
    name,
    role: rawRole,
    password,
    company_slug,
    clinic_ids,
    active,
  } = body ?? {}

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const role: UserRole =
    ROLE_MAP[(rawRole ?? '').toString().toLowerCase()] ?? UserRole.AUXILIAR
  const { firstName, lastName } = splitName(name)
  const isActive = active === undefined ? true : Boolean(active)

  try {
    // Resolve company by slug (schema has `taxId` unique; no `slug` field). Try taxId match.
    let companyId: string | null = null
    if (company_slug && typeof company_slug === 'string') {
      const company = await prisma.company.findFirst({
        where: { OR: [{ taxId: company_slug }, { name: company_slug }] },
      })
      companyId = company?.id ?? null
    }

    // Resolve target work centers from clinic_ids
    // clinic_ids may be: string[] of ids/codes, or the literal 'ALL' for full-company access
    let workCenterId: string | null = null
    let accessibleWorkCenterIds: string[] = []
    if (companyId) {
      if (clinic_ids === 'ALL') {
        const all = await prisma.workCenter.findMany({
          where: { companyId, deletedAt: null, isActive: true },
          select: { id: true },
        })
        accessibleWorkCenterIds = all.map((w) => w.id)
      } else if (Array.isArray(clinic_ids) && clinic_ids.length > 0) {
        const wcs = await prisma.workCenter.findMany({
          where: {
            companyId,
            OR: [
              { id: { in: clinic_ids as string[] } },
              { code: { in: clinic_ids as string[] } },
            ],
          },
          select: { id: true },
        })
        accessibleWorkCenterIds = wcs.map((w) => w.id)
      }
      workCenterId = accessibleWorkCenterIds[0] ?? null
    }

    const existing = await prisma.user.findUnique({ where: { email } })

    const passwordHash =
      password && typeof password === 'string' && password.length > 0
        ? await bcrypt.hash(password, 10)
        : undefined

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        firstName,
        lastName,
        role,
        isActive,
        passwordHash:
          passwordHash ?? (await bcrypt.hash(Math.random().toString(36) + Date.now(), 10)),
        ...(companyId ? { companyId } : {}),
      },
      update: {
        ...(firstName ? { firstName } : {}),
        ...(lastName !== undefined ? { lastName } : {}),
        role,
        isActive,
        ...(passwordHash ? { passwordHash } : {}),
        ...(companyId ? { companyId } : {}),
      },
    })

    // Sync UserWorkCenter bridge rows (multi-clinic access)
    if (companyId && accessibleWorkCenterIds.length > 0) {
      await prisma.userWorkCenter.deleteMany({
        where: {
          userId: user.id,
          workCenterId: { notIn: accessibleWorkCenterIds },
        },
      })
      for (const wcId of accessibleWorkCenterIds) {
        await prisma.userWorkCenter.upsert({
          where: { userId_workCenterId: { userId: user.id, workCenterId: wcId } },
          create: { userId: user.id, workCenterId: wcId },
          update: {},
        })
      }
    } else if (companyId && Array.isArray(clinic_ids) && clinic_ids.length === 0) {
      // Explicitly empty → clear all access
      await prisma.userWorkCenter.deleteMany({ where: { userId: user.id } })
    }

    // Update/create Employee record and assign workCenter when we have a company
    if (companyId) {
      const employee = await prisma.employee.findFirst({
        where: { companyId, email },
      })
      if (employee) {
        if (workCenterId && employee.workCenterId !== workCenterId) {
          await prisma.employee.update({
            where: { id: employee.id },
            data: { workCenterId },
          })
        }
        if (user.employeeId !== employee.id) {
          await prisma.user.update({
            where: { id: user.id },
            data: { employeeId: employee.id },
          })
        }
      }
    }

    console.log(
      JSON.stringify({
        level: 'info',
        scope: 'sync/user',
        event: existing ? 'updated' : 'created',
        email,
        role,
        companyId,
        workCenterId,
        clinicMode: clinic_ids === 'ALL' ? 'ALL' : Array.isArray(clinic_ids) ? clinic_ids.length : 0,
      }),
    )

    return NextResponse.json({
      ok: true,
      userId: user.id,
      companyId,
      workCenterId,
      created: !existing,
    })
  } catch (e: any) {
    console.error(
      JSON.stringify({
        level: 'error',
        scope: 'sync/user',
        email,
        message: e?.message ?? 'unknown',
      }),
    )
    return NextResponse.json({ error: e?.message ?? 'sync failed' }, { status: 500 })
  }
}
