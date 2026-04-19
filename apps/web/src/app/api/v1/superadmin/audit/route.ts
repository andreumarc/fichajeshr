import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const page  = parseInt(url.searchParams.get('page')  ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const action     = url.searchParams.get('action') ?? undefined;
    const entityType = url.searchParams.get('entityType') ?? undefined;
    const from = url.searchParams.get('from');
    const to   = url.searchParams.get('to');
    const skip = (page - 1) * limit;

    const where: any = {
      ...(action && { action: action as any }),
      ...(entityType && { entityType }),
      ...((from || to) && {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to   ? { lte: new Date(to)   } : {}),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user:    { select: { firstName: true, lastName: true, email: true } },
          company: { select: { name: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
