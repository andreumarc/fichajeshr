import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const skip = (page - 1) * limit;

    const where: any = { employeeId: user!.employeeId };
    if (from || to) {
      where.timestamp = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        include: { workCenter: { select: { name: true, city: true } } },
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
