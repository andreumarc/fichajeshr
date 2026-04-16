import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction, EmployeeStatus } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN']);
  if (error) return error;

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: user!.companyId, deletedAt: null },
      include: {
        workCenter: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        credentials: { where: { isActive: true }, select: { method: true, lastUsed: true } },
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });
    return NextResponse.json(employee);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: user!.companyId, deletedAt: null },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });

    const dto = await req.json();
    const before = { ...employee };

    const updated = await prisma.employee.update({
      where: { id: params.id },
      data: {
        ...dto,
        fullName: dto.firstName || dto.lastName
          ? `${dto.firstName ?? employee.firstName} ${dto.lastName ?? employee.lastName}`
          : undefined,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        updatedBy: user!.sub,
      },
    });

    await auditLog({
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: params.id,
      userId: user!.sub,
      companyId: user!.companyId,
      before,
      after: updated,
      description: `Employee ${updated.fullName} updated`,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, companyId: user!.companyId, deletedAt: null },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });

    await prisma.employee.update({
      where: { id: params.id },
      data: { status: EmployeeStatus.INACTIVE, updatedBy: user!.sub, deletedAt: new Date() },
    });

    await auditLog({
      action: AuditAction.DELETE,
      entityType: 'Employee',
      entityId: params.id,
      userId: user!.sub,
      companyId: user!.companyId,
      before: employee,
      description: `Employee ${employee.fullName} deactivated`,
    });

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
