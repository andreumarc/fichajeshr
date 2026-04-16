import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: user!.companyId, deletedAt: null },
      select: {
        id: true,
        fullName: true,
        employeeCode: true,
        department: true,
        weeklyHours: true,
        status: true,
        schedules: {
          where: { isActive: true },
          include: { schedule: { include: { days: true } } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });
    return NextResponse.json(employees);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
