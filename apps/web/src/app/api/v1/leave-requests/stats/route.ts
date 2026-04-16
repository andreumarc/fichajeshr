import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { LeaveStatus, LeaveType } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const now = new Date();

    const [pending, approvedThisMonth, sickLeaveActive] = await Promise.all([
      prisma.leaveRequest.count({
        where: { companyId, status: LeaveStatus.PENDING, deletedAt: null },
      }),
      prisma.leaveRequest.count({
        where: {
          companyId,
          status: LeaveStatus.APPROVED,
          deletedAt: null,
          startDate: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          companyId,
          type: LeaveType.SICK_LEAVE,
          status: LeaveStatus.APPROVED,
          deletedAt: null,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      }),
    ]);

    return NextResponse.json({ pending, approvedThisMonth, sickLeaveActive });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
