import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

// GET: SUPERADMIN lists all companies
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const data = await prisma.company.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { employees: true, workCenters: true } } },
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

// POST: SUPERADMIN creates company
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const company = await prisma.company.create({ data: dto });
    return NextResponse.json(company, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
