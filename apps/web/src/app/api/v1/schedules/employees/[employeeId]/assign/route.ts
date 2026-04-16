import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function POST(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const { scheduleId, startDate, endDate } = dto;

    // Deactivate previous active assignment
    await prisma.employeeSchedule.updateMany({
      where: { employeeId: params.employeeId, isActive: true },
      data: { isActive: false },
    });

    const assignment = await prisma.employeeSchedule.create({
      data: {
        employeeId: params.employeeId,
        scheduleId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
        createdBy: user!.sub,
      },
      include: { schedule: { include: { days: true } } },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
