import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const data = await prisma.workSchedule.findMany({
      where: { companyId: user!.companyId, deletedAt: null },
      include: { days: true, _count: { select: { assignments: { where: { isActive: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const { days, ...scheduleData } = dto;
    const schedule = await prisma.workSchedule.create({
      data: {
        ...scheduleData,
        companyId: user!.companyId!,
        createdBy: user!.sub,
        days: { create: days },
      },
      include: { days: true },
    });
    return NextResponse.json(schedule, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
