import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [companiesCount, employeesCount, activeCompanies, todayEntries] = await Promise.all([
      prisma.company.count({ where: { deletedAt: null } }),
      prisma.employee.count({ where: { deletedAt: null } }),
      prisma.company.count({ where: { isActive: true, deletedAt: null } }),
      prisma.timeEntry.count({ where: { timestamp: { gte: startOfDay } } }),
    ]);

    return NextResponse.json({
      companiesCount,
      employeesCount,
      activeCompanies,
      inactiveCompanies: companiesCount - activeCompanies,
      todayEntries,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
