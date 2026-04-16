import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import * as bcrypt from 'bcryptjs';
import { AuditAction, ClockMethod } from '@prisma/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const body = await req.json();
    const { pin } = body;

    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId, deletedAt: null },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });

    const pinHash = await bcrypt.hash(pin, 12);

    await prisma.employeeCredential.upsert({
      where: { employeeId_method: { employeeId: params.id, method: ClockMethod.PIN } },
      update: { secret: pinHash, isActive: true },
      create: { employeeId: params.id, method: ClockMethod.PIN, secret: pinHash, createdBy: user!.sub },
    });

    await auditLog({
      action: AuditAction.PIN_RESET,
      entityType: 'Employee',
      entityId: params.id,
      userId: user!.sub,
      companyId,
      description: `PIN reset for employee ${employee.fullName} by user ${user!.sub}`,
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
