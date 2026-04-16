import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { LeaveStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const { action, hrNotes } = dto;
    const companyId = user!.companyId!;

    const request = await prisma.leaveRequest.findFirst({
      where: { id: params.id, companyId, deletedAt: null },
    });
    if (!request) return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: 404 });
    if (request.status !== LeaveStatus.PENDING) {
      return NextResponse.json({ message: 'La solicitud ya fue procesada' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: newStatus, reviewedBy: user!.sub, reviewedAt: new Date(), hrNotes },
      include: { employee: { select: { fullName: true } } },
    });

    // Update balance if approved
    if (newStatus === LeaveStatus.APPROVED) {
      const year = new Date(request.startDate).getFullYear();
      let balance = await prisma.leaveBalance.findUnique({
        where: { employeeId_year: { employeeId: request.employeeId, year } },
      });
      if (!balance) {
        balance = await prisma.leaveBalance.create({
          data: { companyId, employeeId: request.employeeId, year },
        });
      }
      if (request.type === 'VACATION') {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { vacationUsed: { increment: request.days } },
        });
      } else if (request.type === 'PERSONAL_DAY') {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { personalUsed: { increment: request.days } },
        });
      }
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
