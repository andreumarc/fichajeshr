import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.JWT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug, name, active, taxId, email, phone } = await request.json()
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  // fichaje Company has no slug field — use taxId as the unique upsert key.
  // Accept taxId directly; fall back to slug if taxId is absent.
  const resolvedTaxId = (taxId ?? slug ?? '').trim() || null

  if (resolvedTaxId) {
    await prisma.company.upsert({
      where: { taxId: resolvedTaxId },
      update: {
        name,
        email: email ?? undefined,
        phone: phone ?? undefined,
        isActive: active !== false,
      },
      create: {
        name,
        taxId: resolvedTaxId,
        email: email ?? undefined,
        phone: phone ?? undefined,
        isActive: active !== false,
      },
    })
  } else {
    // No unique key available — create only (avoid duplicates by name lookup).
    const existing = await prisma.company.findFirst({ where: { name } })
    if (existing) {
      await prisma.company.update({
        where: { id: existing.id },
        data: {
          email: email ?? undefined,
          phone: phone ?? undefined,
          isActive: active !== false,
        },
      })
    } else {
      await prisma.company.create({
        data: {
          name,
          email: email ?? undefined,
          phone: phone ?? undefined,
          isActive: active !== false,
        },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
