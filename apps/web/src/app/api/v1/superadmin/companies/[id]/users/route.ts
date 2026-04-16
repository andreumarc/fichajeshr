import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const company = await prisma.company.findUnique({ where: { id: params.id } });
    if (!company) return NextResponse.json({ message: 'Empresa no encontrada' }, { status: 404 });

    const dto = await req.json();
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const newUser = await prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: hashedPassword,
        role: dto.role,
        companyId: params.id,
        isActive: true,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, isActive: true, createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
