// GET /api/filters/context — returns {companies, workCenters} scoped by caller role
// SUPERADMIN  → all active companies + all workcenters
// others      → only their own company + its workcenters
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req)
  if (error) return error

  const isSuper = user!.role === 'SUPERADMIN'

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(isSuper ? {} : { id: user!.companyId }),
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const workCenters = await prisma.workCenter.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      ...(isSuper ? {} : { companyId: user!.companyId }),
    },
    select: { id: true, name: true, companyId: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ companies, workCenters })
}
