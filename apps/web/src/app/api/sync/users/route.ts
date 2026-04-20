// GET /api/sync/users — Hub pull: list active users
// Auth: Bearer JWT_SECRET (or HUB_JWT_SECRET — both accepted)
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ROLE_MAP: Record<string, string> = {
  SUPERADMIN:    'superadmin',
  COMPANY_ADMIN: 'admin',
  HR:            'rrhh',
  MANAGER:       'dirección',
  EMPLOYEE:      'empleado',
  KIOSK:         'empleado',
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

function authorized(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const a = process.env.JWT_SECRET     ? `Bearer ${process.env.JWT_SECRET}`     : null
  const b = process.env.HUB_JWT_SECRET ? `Bearer ${process.env.HUB_JWT_SECRET}` : null
  return Boolean((a && auth === a) || (b && auth === b))
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companySlug = req.nextUrl.searchParams.get('company_id')

  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      email: true, firstName: true, lastName: true, role: true, isActive: true,
      company: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const out = users
    .map((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email
      const slug = u.company?.name ? slugify(u.company.name) : null
      return {
        email:        u.email.toLowerCase(),
        name,
        role:         ROLE_MAP[u.role] ?? 'empleado',
        company_slug: slug,
        active:       u.isActive,
      }
    })
    .filter((u) => !companySlug || u.company_slug === companySlug.toLowerCase())

  return NextResponse.json(out)
}
