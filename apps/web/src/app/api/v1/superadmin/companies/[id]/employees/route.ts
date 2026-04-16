import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as bcrypt from 'bcryptjs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const data = await prisma.employee.findMany({
      where: { companyId: params.id, deletedAt: null },
      include: {
        workCenter: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = params.id;
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });

    const dto = await req.json();

    const existing = await prisma.employee.findFirst({
      where: { companyId, employeeCode: dto.employeeCode },
    });
    if (existing) {
      return NextResponse.json({ message: `Codigo de empleado '${dto.employeeCode}' ya existe en esta empresa` }, { status: 409 });
    }

    const { createUser, userPassword, ...empData } = dto;

    const employee = await prisma.employee.create({
      data: {
        companyId,
        firstName: empData.firstName,
        lastName: empData.lastName,
        fullName: `${empData.firstName} ${empData.lastName}`,
        email: empData.email ?? null,
        dni: empData.dni ?? null,
        phone: empData.phone ?? null,
        employeeCode: empData.employeeCode,
        department: empData.department ?? null,
        position: empData.position ?? null,
        weeklyHours: empData.weeklyHours ?? 40,
        workCenterId: empData.workCenterId ?? null,
        status: 'ACTIVE',
      },
    });

    if (createUser && dto.email && userPassword) {
      const passwordHash = await bcrypt.hash(userPassword, 12);
      await prisma.user.create({
        data: {
          companyId,
          employeeId: employee.id,
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          role: 'EMPLOYEE',
          isActive: true,
        },
      });
    }

    return NextResponse.json(employee, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
