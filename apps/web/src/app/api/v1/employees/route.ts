import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/api-auth';
import { getActiveClinicId } from '@/lib/active-clinic';
import { auditLog } from '@/lib/audit';
import * as bcrypt from 'bcryptjs';
import { AuditAction, EmployeeStatus, ClockMethod, UserRole } from '@prisma/client';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function GET(req: NextRequest) {
  const { user, error } = requirePermission(req, 'employees:manage');
  if (error) return error;

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as EmployeeStatus | null;
    const workCenterId = url.searchParams.get('workCenterId') ?? getActiveClinicId(req);
    const department = url.searchParams.get('department');
    const search = url.searchParams.get('search');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const limit = parseInt(url.searchParams.get('limit') ?? '50');
    const skip = (page - 1) * limit;

    const where: any = { companyId: user!.companyId, deletedAt: null };
    if (status) where.status = status;
    if (workCenterId) where.workCenterId = workCenterId;
    if (department) where.department = department;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          workCenter: { select: { id: true, name: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { timeEntries: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = requirePermission(req, 'employees:manage');
  if (error) return error;

  try {
    const dto = await req.json();
    const companyId = user!.companyId!;

    // Check unique employee code
    const existing = await prisma.employee.findFirst({
      where: { companyId, employeeCode: dto.employeeCode },
    });
    if (existing) {
      return NextResponse.json({ message: `Codigo de empleado '${dto.employeeCode}' ya existe` }, { status: 409 });
    }

    const employee = await prisma.employee.create({
      data: {
        companyId,
        workCenterId: dto.workCenterId ?? null,
        supervisorId: dto.supervisorId ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        fullName: `${dto.firstName} ${dto.lastName}`,
        dni: dto.dni ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        employeeCode: dto.employeeCode,
        department: dto.department ?? null,
        position: dto.position ?? null,
        contractType: dto.contractType ?? null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        status: EmployeeStatus.ACTIVE,
        allowedMethods: dto.allowedMethods ?? [ClockMethod.EMAIL_PASSWORD, ClockMethod.PIN],
        allowMobile: dto.allowMobile ?? true,
        allowWeb: dto.allowWeb ?? true,
        allowKiosk: dto.allowKiosk ?? true,
        weeklyHours: dto.weeklyHours ?? 40,
        createdBy: user!.sub,
      },
    });

    // Create PIN credential if provided
    if (dto.pin) {
      const pinHash = await bcrypt.hash(dto.pin, 12);
      await prisma.employeeCredential.create({
        data: { employeeId: employee.id, method: ClockMethod.PIN, secret: pinHash },
      });
    }

    // Auto-create User if email is provided
    let tempPassword: string | undefined;
    let userId: string | undefined;
    if (dto.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: dto.email } });
      if (!existingUser) {
        tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const newUser = await prisma.user.create({
          data: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            companyId,
            role: dto.portalRole ?? UserRole.EMPLOYEE,
            employeeId: employee.id,
            mustChangePassword: true,
            createdBy: user!.sub,
          },
        });
        userId = newUser.id;
      }
    }

    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: employee.id,
      userId: user!.sub,
      companyId,
      after: employee,
      description: `Employee ${employee.fullName} created`,
    });

    return NextResponse.json(
      { ...employee, ...(tempPassword ? { tempPassword, userId } : {}) },
      { status: 201 },
    );
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
