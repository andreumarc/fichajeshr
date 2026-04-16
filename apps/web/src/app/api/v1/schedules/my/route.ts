import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['EMPLOYEE', 'MANAGER', 'HR', 'COMPANY_ADMIN']);
  if (error) return error;

  try {
    const schedule = await prisma.employeeSchedule.findFirst({
      where: { employeeId: user!.employeeId!, isActive: true },
      include: { schedule: { include: { days: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(schedule);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
