import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { ClockMethod } from '@prisma/client';
import * as QRCode from 'qrcode';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId, deletedAt: null },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });

    const token = `QR-${companyId}-${params.id}-${Date.now()}`;

    await prisma.employeeCredential.upsert({
      where: { employeeId_method: { employeeId: params.id, method: ClockMethod.QR_CODE } },
      update: { secret: token, isActive: true },
      create: { employeeId: params.id, method: ClockMethod.QR_CODE, secret: token },
    });

    const qrDataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', margin: 2 });
    return NextResponse.json({ token, qrDataUrl, employeeName: employee.fullName });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
