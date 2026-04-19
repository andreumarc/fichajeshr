import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const centers = await prisma.workCenter.findMany({
      where: { deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { employees: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(centers);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
