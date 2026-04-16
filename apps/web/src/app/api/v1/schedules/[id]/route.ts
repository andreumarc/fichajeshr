import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: params.id, companyId: user!.companyId, deletedAt: null },
      include: {
        days: true,
        assignments: {
          where: { isActive: true },
          include: {
            employee: { select: { id: true, fullName: true, employeeCode: true, department: true } },
          },
        },
      },
    });
    if (!schedule) return NextResponse.json({ message: 'Horario no encontrado' }, { status: 404 });
    return NextResponse.json(schedule);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: params.id, companyId: user!.companyId },
    });
    if (!schedule) return NextResponse.json({ message: 'Horario no encontrado' }, { status: 404 });

    const dto = await req.json();
    const { days, ...rest } = dto;

    if (days) {
      await prisma.workScheduleDay.deleteMany({ where: { scheduleId: params.id } });
    }

    const updated = await prisma.workSchedule.update({
      where: { id: params.id },
      data: { ...rest, ...(days ? { days: { create: days } } : {}) },
      include: { days: true },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const schedule = await prisma.workSchedule.findFirst({
      where: { id: params.id, companyId: user!.companyId },
    });
    if (!schedule) return NextResponse.json({ message: 'Horario no encontrado' }, { status: 404 });

    await prisma.workSchedule.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
