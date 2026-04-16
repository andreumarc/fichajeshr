import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const data = await prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { employees: true, workCenters: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const dto = await req.json();
    const { adminEmail, adminFirstName, adminLastName, adminPassword, ...companyData } = dto;

    const company = await prisma.company.create({
      data: {
        name: companyData.name,
        taxId: companyData.taxId,
        email: companyData.email,
        phone: companyData.phone,
        address: companyData.address,
        city: companyData.city,
        country: companyData.country ?? 'ES',
        timezone: companyData.timezone ?? 'Europe/Madrid',
        isActive: true,
      },
    });

    let adminUser = null;
    if (adminEmail && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          firstName: adminFirstName ?? '',
          lastName: adminLastName ?? '',
          passwordHash: hashedPassword,
          role: UserRole.COMPANY_ADMIN,
          companyId: company.id,
          isActive: true,
        },
        select: {
          id: true, email: true, firstName: true, lastName: true,
          role: true, isActive: true, createdAt: true,
        },
      });
    }

    return NextResponse.json({ company, adminUser }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
