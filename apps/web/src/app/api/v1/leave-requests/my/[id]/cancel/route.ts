import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { LeaveStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['EMPLOYEE', 'MANAGER']);
  if (error) return error;

  try {
    const request = await prisma.leaveRequest.findFirst({
      where: { id: params.id, employeeId: user!.employeeId, deletedAt: null },
    });
    if (!request) return NextResponse.json({ message: 'Solicitud no encontrada' }, { status: 404 });
    if (request.status === LeaveStatus.APPROVED) {
      return NextResponse.json({ message: 'No se puede cancelar una solicitud aprobada' }, { status: 400 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: LeaveStatus.CANCELLED },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
