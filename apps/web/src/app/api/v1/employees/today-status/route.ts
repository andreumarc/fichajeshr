import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { EmployeeStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN']);
  if (error) return error;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employees = await prisma.employee.findMany({
      where: { companyId: user!.companyId, status: EmployeeStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        workCenterId: true,
        timeEntries: {
          where: { timestamp: { gte: today } },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const result = employees.map((emp) => {
      const lastEntry = emp.timeEntries[0];
      let status = 'NOT_CLOCKED_IN';
      if (lastEntry) {
        const statusMap: Record<string, string> = {
          CHECK_IN: 'WORKING',
          CHECK_OUT: 'CLOCKED_OUT',
          BREAK_START: 'ON_BREAK',
          BREAK_END: 'WORKING',
        };
        status = statusMap[lastEntry.type] ?? 'UNKNOWN';
      }
      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        workCenterId: emp.workCenterId,
        status,
        lastEntryType: lastEntry?.type,
        lastEntryTime: lastEntry?.timestamp,
      };
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
