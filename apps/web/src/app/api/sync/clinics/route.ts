// GET  /api/sync/clinics — returns active work centers for Hub import
// POST /api/sync/clinics — upserts work centers pushed from Hub
// Auth: Bearer HUB_JWT_SECRET (fichaje reuses JWT_SECRET as HUB_JWT_SECRET in prod)
// fichaje web == backend: runs on Vercel, uses Prisma directly against Supabase.
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function assertAuth(request: NextRequest): boolean {
  const auth = request.headers.get('authorization') ?? ''
  const hubSecret = process.env.HUB_JWT_SECRET ?? process.env.JWT_SECRET ?? ''
  if (!hubSecret) return false
  return auth === `Bearer ${hubSecret}`
}

export async function GET(request: NextRequest) {
  if (!assertAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const rows = await prisma.workCenter.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(rows.map((r) => ({ id: r.id, name: r.name, active: true })))
}

export async function POST(request: NextRequest) {
  if (!assertAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await request.json().catch(() => ({}))) as {
    company_slug?: string
    clinics?: { id: string; name: string; active?: boolean }[]
  }
  if (!body.company_slug || !Array.isArray(body.clinics)) {
    return NextResponse.json({ error: 'company_slug and clinics[] required' }, { status: 400 })
  }

  // fichaje has no Company.slug column — lookup by taxId (same pattern as /api/sync/company).
  const company =
    (await prisma.company.findUnique({ where: { taxId: body.company_slug } })) ??
    (await prisma.company.findFirst({ where: { name: body.company_slug } }))

  if (!company) {
    return NextResponse.json({ error: 'company not found' }, { status: 404 })
  }

  let count = 0
  for (const c of body.clinics) {
    const active = c.active !== false
    try {
      await prisma.workCenter.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          isActive: active,
          deletedAt: active ? null : new Date(),
        },
        create: {
          id: c.id,
          name: c.name,
          companyId: company.id,
          isActive: active,
        },
      })
      count++
    } catch {
      /* non-fatal */
    }
  }
  return NextResponse.json({ ok: true, count })
}
