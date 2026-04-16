import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { DayOfWeek } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['EMPLOYEE', 'MANAGER', 'HR', 'COMPANY_ADMIN']);
  if (error) return error;

  try {
    const assignment = await prisma.employeeSchedule.findFirst({
      where: { employeeId: user!.employeeId!, isActive: true },
      include: { schedule: { include: { days: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (!assignment) return NextResponse.json({ hasSchedule: false });

    const daysArr = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayDow = daysArr[new Date().getDay()] as DayOfWeek;
    const scheduleDay = assignment.schedule.days.find((d) => d.dayOfWeek === todayDow);

    return NextResponse.json({
      hasSchedule: true,
      scheduleName: assignment.schedule.name,
      scheduleType: assignment.schedule.type,
      today: scheduleDay ?? null,
      weeklyHours: assignment.schedule.weeklyHours,
      annualHours: assignment.schedule.annualHours,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
