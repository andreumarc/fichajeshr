import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [companiesCount, employeesCount, activeCompanies, todayEntries] = await Promise.all([
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.employee.count({ where: { deletedAt: null } }),
      this.prisma.company.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.timeEntry.count({ where: { timestamp: { gte: startOfDay } } }),
    ]);

    return {
      companiesCount,
      employeesCount,
      activeCompanies,
      inactiveCompanies: companiesCount - activeCompanies,
      todayEntries,
    };
  }

  async findAllCompanies() {
    return this.prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            employees: true,
            workCenters: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findCompanyById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        users: {
          where: { deletedAt: null },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: {
            employees: true,
            workCenters: true,
          },
        },
      },
    });

    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async createCompany(dto: {
    name: string;
    taxId?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    timezone?: string;
    adminEmail?: string;
    adminFirstName?: string;
    adminLastName?: string;
    adminPassword?: string;
  }) {
    const { adminEmail, adminFirstName, adminLastName, adminPassword, ...companyData } = dto;

    const company = await this.prisma.company.create({
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
      adminUser = await this.prisma.user.create({
        data: {
          email: adminEmail,
          firstName: adminFirstName ?? '',
          lastName: adminLastName ?? '',
          passwordHash: hashedPassword,
          role: UserRole.ADMIN,
          companyId: company.id,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
    }

    return { company, adminUser };
  }

  async deleteCompany(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    // Cascade: hard-delete time entries of this company
    await this.prisma.timeEntry.deleteMany({ where: { companyId: id } });
    // Cascade: soft-delete all employees of this company
    await this.prisma.employee.updateMany({
      where: { companyId: id, deletedAt: null },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });
    return this.prisma.company.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }

  async updateCompany(
    id: string,
    dto: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      isActive?: boolean;
    },
  ) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async createUserForCompany(
    companyId: string,
    dto: {
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      password: string;
    },
  ) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: hashedPassword,
        role: dto.role,
        companyId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async deactivateUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
  }

  // ── Employee management (superadmin on behalf of any company) ──────────────────

  async findCompanyEmployees(companyId: string) {
    return this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      include: {
        workCenter: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, role: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async createEmployee(companyId: string, dto: {
    firstName: string;
    lastName: string;
    email?: string;
    dni?: string;
    phone?: string;
    employeeCode: string;
    department?: string;
    position?: string;
    weeklyHours?: number;
    workCenterId?: string;
    createUser?: boolean;
    userPassword?: string;
  }) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Empresa no encontrada');

    // Check duplicate code
    const existing = await this.prisma.employee.findFirst({
      where: { companyId, employeeCode: dto.employeeCode },
    });
    if (existing) throw new Error(`Código de empleado '${dto.employeeCode}' ya existe en esta empresa`);

    const { createUser, userPassword, ...empData } = dto;

    const employee = await this.prisma.employee.create({
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

    // Optionally create a system user for the employee
    if (createUser && dto.email && userPassword) {
      const passwordHash = await bcrypt.hash(userPassword, 12);
      await this.prisma.user.create({
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

    return employee;
  }

  async deactivateEmployee(employeeId: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, companyId } });
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });
  }

  async findCompanyWorkCenters(companyId: string) {
    return this.prisma.workCenter.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: { id: true, name: true, city: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllEmployees(companyId?: string) {
    return this.prisma.employee.findMany({
      where: { ...(companyId ? { companyId } : {}), deletedAt: null },
      include: {
        company: { select: { id: true, name: true } },
        workCenter: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
        _count: { select: { timeEntries: true } },
      },
      orderBy: [{ company: { name: 'asc' } }, { lastName: 'asc' }],
    });
  }

  async deleteEmployee(employeeId: string) {
    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
    if (!emp) throw new NotFoundException('Empleado no encontrado');
    // Hard-delete time entries first
    await this.prisma.timeEntry.deleteMany({ where: { employeeId } });
    // Soft-delete employee
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });
  }

  async findAllTimeEntries(page = 1, limit = 50, companyId?: string, employeeId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (companyId) where.companyId = companyId;
    if (employeeId) where.employeeId = employeeId;
    const [data, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        include: {
          employee: { select: { id: true, fullName: true, employeeCode: true } },
          company: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async deleteTimeEntry(id: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Fichaje no encontrado');
    return this.prisma.timeEntry.delete({ where: { id } });
  }

  async deleteAllTimeEntriesForEmployee(employeeId: string) {
    return this.prisma.timeEntry.deleteMany({ where: { employeeId } });
  }

  async exportCompaniesToExcel(): Promise<Buffer> {
    const companies = await this.prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { employees: true, workCenters: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Nombre', 'NIF/CIF', 'Email', 'Teléfono', 'Ciudad', 'País',
      'Zona horaria', 'Activa', 'Empleados', 'Centros', 'Usuarios',
      'Fecha creación',
    ];

    const rows = companies.map((c) => [
      c.name,
      c.taxId ?? '',
      c.email ?? '',
      c.phone ?? '',
      c.city ?? '',
      c.country ?? '',
      c.timezone ?? '',
      c.isActive ? 'Activa' : 'Inactiva',
      c._count.employees,
      c._count.workCenters,
      c._count.users,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES') : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async exportCompanyEmployeesToExcel(companyId: string): Promise<Buffer> {
    return this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      include: {
        workCenter: { select: { name: true } },
        user: { select: { email: true, isActive: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }).then((employees) => {
      const headers = [
        'Código', 'Nombre', 'Apellidos', 'Email', 'Departamento',
        'Puesto', 'Centro de trabajo', 'Estado', 'Horas semanales',
        'Acceso portal',
      ];
      const rows = employees.map((e) => [
        e.employeeCode, e.firstName, e.lastName, e.email ?? '',
        e.department ?? '', e.position ?? '', e.workCenter?.name ?? '',
        e.status, e.weeklyHours ?? 40,
        e.user ? (e.user.isActive ? 'Activo' : 'Inactivo') : 'Sin acceso',
      ]);
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
      XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
      return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    });
  }

  async resetEmployeePassword(employeeId: string, adminId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    let user = await this.prisma.user.findUnique({ where: { employeeId } });

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    if (!user) {
      if (!employee.email) throw new NotFoundException('El empleado no tiene email ni usuario vinculado');
      user = await this.prisma.user.create({
        data: {
          email: employee.email,
          passwordHash,
          firstName: employee.firstName,
          lastName: employee.lastName,
          companyId: employee.companyId,
          role: UserRole.AUXILIAR,
          employeeId: employee.id,
          mustChangePassword: true,
          createdBy: adminId,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: true, updatedBy: adminId },
      });
    }

    return { tempPassword, email: user.email, employeeName: employee.fullName };
  }
}
