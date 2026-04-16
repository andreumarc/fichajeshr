import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('companyId');

    const data = await prisma.employee.findMany({
      where: { ...(companyId ? { companyId } : {}), deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        workCenter: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
        _count: { select: { timeEntries: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { lastName: 'asc' }],
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
