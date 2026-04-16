import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['EMPLOYEE', 'MANAGER', 'HR', 'COMPANY_ADMIN']);
  if (error) return error;

  try {
    const year = new Date().getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId: user!.employeeId!, year } },
    });
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: { companyId: user!.companyId!, employeeId: user!.employeeId!, year },
      });
    }
    return NextResponse.json(balance);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
