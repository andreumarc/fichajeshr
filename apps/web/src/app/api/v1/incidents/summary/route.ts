import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { IncidentStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const [open, inReview, resolved, byType] = await Promise.all([
      prisma.incident.count({ where: { companyId, status: IncidentStatus.OPEN } }),
      prisma.incident.count({ where: { companyId, status: IncidentStatus.IN_REVIEW } }),
      prisma.incident.count({ where: { companyId, status: IncidentStatus.RESOLVED } }),
      prisma.incident.groupBy({
        by: ['type'],
        where: { companyId },
        _count: { type: true },
      }),
    ]);
    return NextResponse.json({ open, inReview, resolved, byType });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
