import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { LeaveType, LeaveStatus } from '@prisma/client';

function businessDays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const days = businessDays(new Date(dto.startDate), new Date(dto.endDate));

    const request = await prisma.leaveRequest.create({
      data: {
        companyId: user!.companyId!,
        employeeId: dto.employeeId,
        type: LeaveType.SICK_LEAVE,
        status: LeaveStatus.APPROVED,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        reason: dto.reason,
      },
      include: { employee: { select: { fullName: true } } },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
