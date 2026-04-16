import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const employeeId = params.id;
    const year = new Date().getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_year: { employeeId, year } },
    });
    if (!balance) {
      const emp = await prisma.employee.findUnique({
        where: { id: employeeId },
        select: { companyId: true },
      });
      balance = await prisma.leaveBalance.create({
        data: { companyId: emp!.companyId, employeeId, year },
      });
    }
    return NextResponse.json(balance);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
