import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const companyId = url.searchParams.get('companyId');
    const employeeId = url.searchParams.get('employeeId');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (employeeId) where.employeeId = employeeId;

    const [data, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
