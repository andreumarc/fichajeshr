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

// GET: HR lists all requests
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as LeaveStatus | null;
    const type = url.searchParams.get('type') as LeaveType | null;
    const employeeId = url.searchParams.get('employeeId');

    const data = await prisma.leaveRequest.findMany({
      where: {
        companyId: user!.companyId,
        deletedAt: null,
        ...(status && { status }),
        ...(type && { type }),
        ...(employeeId && { employeeId }),
      },
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: Employee creates request
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['EMPLOYEE', 'MANAGER', 'HR', 'COMPANY_ADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.companyId!;
    const employeeId = user!.employeeId!;

    const days = businessDays(new Date(dto.startDate), new Date(dto.endDate));
    if (days <= 0) return NextResponse.json({ message: 'Las fechas no son validas' }, { status: 400 });

    // Check overlapping
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        deletedAt: null,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: new Date(dto.endDate) },
        endDate: { gte: new Date(dto.startDate) },
      },
    });
    if (overlap) return NextResponse.json({ message: 'Ya existe una solicitud para ese periodo' }, { status: 400 });

    const request = await prisma.leaveRequest.create({
      data: {
        companyId,
        employeeId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        days,
        reason: dto.reason,
        status: dto.type === LeaveType.SICK_LEAVE ? LeaveStatus.APPROVED : LeaveStatus.PENDING,
      },
      include: { employee: { select: { fullName: true } } },
    });

    return NextResponse.json(request, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
