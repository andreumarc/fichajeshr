import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const employee = await prisma.employee.findFirst({
      where: { id: params.id, deletedAt: null },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 404 });

    let dbUser = await prisma.user.findUnique({ where: { employeeId: params.id } });
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    if (!dbUser) {
      if (!employee.email) {
        return NextResponse.json({ message: 'El empleado no tiene email ni usuario vinculado' }, { status: 404 });
      }
      dbUser = await prisma.user.create({
        data: {
          email: employee.email,
          passwordHash,
          firstName: employee.firstName,
          lastName: employee.lastName,
          companyId: employee.companyId,
          role: UserRole.EMPLOYEE,
          employeeId: employee.id,
          mustChangePassword: true,
          createdBy: user!.sub,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { passwordHash, mustChangePassword: true, updatedBy: user!.sub },
      });
    }

    return NextResponse.json({ tempPassword, email: dbUser.email, employeeName: employee.fullName });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
