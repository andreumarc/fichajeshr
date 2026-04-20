// GET /api/sync/companies — Hub pull: list active companies
// Auth: Bearer JWT_SECRET (or HUB_JWT_SECRET — both accepted)
// NOTE: Company model has no slug field; we slugify name on-the-fly.
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: {
      name: true, taxId: true, city: true, email: true, phone: true, isActive: true,
    },
    orderBy: { name: 'asc' },
  })

  const out = companies.map((c) => ({
    name:   c.name,
    slug:   slugify(c.name),
    cif:    c.taxId ?? null,
    city:   c.city  ?? null,
    email:  c.email ?? null,
    phone:  c.phone ?? null,
    active: c.isActive,
  }))

  return NextResponse.json(out)
}
