import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const companyId = req.headers.get('x-company-id');
    if (!companyId) {
      return NextResponse.json({ message: 'X-Company-Id header required' }, { status: 400 });
    }

    const url = new URL(req.url);
    const workCenterId = url.searchParams.get('workCenterId');

    const data = await prisma.employee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        allowKiosk: true,
        ...(workCenterId ? { workCenterId } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        department: true,
        allowedMethods: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
