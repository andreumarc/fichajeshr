import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { AuditAction, EmployeeStatus, ClockMethod, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as QRCode from 'qrcode';
import * as XLSX from 'xlsx';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mail: MailService,
    private config: ConfigService,
  ) {}

  async findAll(
    companyId: string,
    filters: {
      status?: EmployeeStatus;
      workCenterId?: string;
      department?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 50, status, workCenterId, department, search } = filters;
    const skip = (page - 1) * limit;

    const where: any = { companyId, deletedAt: null };
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
      this.prisma.employee.findMany({
        where,
        skip,
        take: +limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        include: {
          workCenter: { select: { id: true, name: true } },
          supervisor: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { timeEntries: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page: +page, limit: +limit };
  }

  async findOne(id: string, companyId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        workCenter: true,
        supervisor: { select: { id: true, firstName: true, lastName: true } },
        credentials: { where: { isActive: true }, select: { method: true, lastUsed: true } },
        user: { select: { id: true, email: true, role: true, isActive: true } },
      },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');
    return employee;
  }

  async create(companyId: string, dto: CreateEmployeeDto, createdBy: string) {
    // Check unique employee code
    const existing = await this.prisma.employee.findFirst({
      where: { companyId, employeeCode: dto.employeeCode },
    });
    if (existing) throw new ConflictException(`Código de empleado '${dto.employeeCode}' ya existe`);

    const employee = await this.prisma.employee.create({
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
        createdBy,
      },
    });

    // Create PIN credential if provided
    if (dto.pin) {
      const pinHash = await bcrypt.hash(dto.pin, 12);
      await this.prisma.employeeCredential.create({
        data: { employeeId: employee.id, method: ClockMethod.PIN, secret: pinHash },
      });
    }

    // Auto-create User if email is provided and no user with that email exists yet
    let tempPassword: string | undefined;
    let userId: string | undefined;
    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (!existingUser) {
        tempPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(tempPassword, 12);
        const newUser = await this.prisma.user.create({
          data: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            companyId,
            role: dto.portalRole ?? UserRole.EMPLOYEE,
            employeeId: employee.id,
            mustChangePassword: true,
            createdBy,
          },
        });
        userId = newUser.id;

        // Send welcome email with temporary password (non-blocking)
        const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
        const loginUrl = this.config.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:1000';
        this.mail.sendWelcomeEmployee({
          to: dto.email,
          firstName: dto.firstName,
          companyName: company?.name ?? 'tu empresa',
          tempPassword,
          loginUrl,
        }).catch(() => {}); // fire-and-forget — never block employee creation
      }
    }

    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: employee.id,
      userId: createdBy,
      companyId,
      after: employee,
      description: `Employee ${employee.fullName} created`,
    });

    return { ...employee, ...(tempPassword ? { tempPassword, userId } : {}) };
  }

  async update(id: string, companyId: string, dto: UpdateEmployeeDto, updatedBy: string) {
    const employee = await this.findOne(id, companyId);
    const before = { ...employee };
    const d = dto as any;

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...d,
        fullName: d.firstName || d.lastName
          ? `${d.firstName ?? employee.firstName} ${d.lastName ?? employee.lastName}`
          : undefined,
        hireDate: d.hireDate ? new Date(d.hireDate) : undefined,
        updatedBy,
      },
    });

    await this.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'Employee',
      entityId: id,
      userId: updatedBy,
      companyId,
      before,
      after: updated,
      description: `Employee ${updated.fullName} updated`,
    });

    return updated;
  }

  async deactivate(id: string, companyId: string, userId: string) {
    const employee = await this.findOne(id, companyId);
    const updated = await this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.INACTIVE, updatedBy: userId, deletedAt: new Date() },
    });

    await this.audit.log({
      action: AuditAction.DELETE,
      entityType: 'Employee',
      entityId: id,
      userId,
      companyId,
      before: employee,
      description: `Employee ${employee.fullName} deactivated`,
    });

    return updated;
  }

  async resetPin(id: string, companyId: string, newPin: string, userId: string) {
    const employee = await this.findOne(id, companyId);
    const pinHash = await bcrypt.hash(newPin, 12);

    await this.prisma.employeeCredential.upsert({
      where: { employeeId_method: { employeeId: id, method: ClockMethod.PIN } },
      update: { secret: pinHash, isActive: true },
      create: { employeeId: id, method: ClockMethod.PIN, secret: pinHash, createdBy: userId },
    });

    await this.audit.log({
      action: AuditAction.PIN_RESET,
      entityType: 'Employee',
      entityId: id,
      userId,
      companyId,
      description: `PIN reset for employee ${employee.fullName} by user ${userId}`,
    });

    return { success: true };
  }

  async generateQrCode(id: string, companyId: string) {
    const employee = await this.findOne(id, companyId);
    const token = `QR-${companyId}-${id}-${Date.now()}`;

    await this.prisma.employeeCredential.upsert({
      where: { employeeId_method: { employeeId: id, method: ClockMethod.QR_CODE } },
      update: { secret: token, isActive: true },
      create: { employeeId: id, method: ClockMethod.QR_CODE, secret: token },
    });

    const qrDataUrl = await QRCode.toDataURL(token, { errorCorrectionLevel: 'H', margin: 2 });
    return { token, qrDataUrl, employeeName: employee.fullName };
  }

  async resetUserPassword(employeeId: string, companyId: string, adminId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId, deletedAt: null },
    });
    if (!employee) throw new NotFoundException('Empleado no encontrado');

    let user = await this.prisma.user.findUnique({ where: { employeeId } });

    if (!user) {
      if (!employee.email) throw new NotFoundException('El empleado no tiene email ni usuario vinculado');
      const tempPassword = generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email: employee.email,
          passwordHash,
          firstName: employee.firstName,
          lastName: employee.lastName,
          companyId,
          role: UserRole.EMPLOYEE,
          employeeId: employee.id,
          mustChangePassword: true,
          createdBy: adminId,
        },
      });
      return { tempPassword, email: user.email, employeeName: employee.fullName };
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true, updatedBy: adminId },
    });

    await this.audit.log({
      action: AuditAction.PASSWORD_RESET,
      entityType: 'User',
      entityId: user.id,
      userId: adminId,
      companyId,
      description: `Password reset for employee ${employee.fullName} by admin ${adminId}`,
    });

    // Send password reset email (non-blocking)
    const loginUrl = this.config.get('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:1000';
    this.mail.sendPasswordReset({
      to: user.email,
      firstName: employee.firstName,
      tempPassword,
      loginUrl,
    }).catch(() => {});

    return { tempPassword, email: user.email, employeeName: employee.fullName };
  }

  async getUserInfo(employeeId: string, companyId: string) {
    const emp = await this.prisma.employee.findFirst({
      where: { id: employeeId, companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            mustChangePassword: true,
            lastLogin: true,
          },
        },
      },
    });
    if (!emp) throw new NotFoundException('Empleado no encontrado');
    return { hasUser: !!emp.user, user: emp.user };
  }

  // ── Excel export ─────────────────────────────────────────────────────────────

  async exportToExcel(companyId: string): Promise<Buffer> {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      include: {
        workCenter: { select: { name: true } },
        user: { select: { email: true, isActive: true, lastLogin: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const headers = [
      'Código', 'Nombre', 'Apellidos', 'Email', 'DNI/NIE', 'Teléfono',
      'Departamento', 'Puesto', 'Centro de trabajo', 'Estado',
      'Horas semanales', 'Fecha contratación',
      'Permite móvil', 'Permite web', 'Permite kiosco',
      'Acceso portal', 'Último acceso',
    ];

    const rows = employees.map((e) => [
      e.employeeCode,
      e.firstName,
      e.lastName,
      e.email ?? '',
      e.dni ?? '',
      e.phone ?? '',
      e.department ?? '',
      e.position ?? '',
      e.workCenter?.name ?? '',
      e.status,
      e.weeklyHours ?? 40,
      e.hireDate ? new Date(e.hireDate).toLocaleDateString('es-ES') : '',
      e.allowMobile ? 'Sí' : 'No',
      e.allowWeb ? 'Sí' : 'No',
      e.allowKiosk ? 'Sí' : 'No',
      e.user ? (e.user.isActive ? 'Activo' : 'Inactivo') : 'Sin acceso',
      e.user?.lastLogin ? new Date(e.user.lastLogin).toLocaleString('es-ES') : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ── Excel import ─────────────────────────────────────────────────────────────

  generateImportTemplate(): Buffer {
    const headers = [
      'Nombre*',
      'Apellidos*',
      'Código empleado*',
      'Email',
      'DNI/NIE',
      'Teléfono',
      'Departamento',
      'Puesto',
      'Centro de trabajo',
      'Horas semanales',
      'PIN (4-8 dígitos)',
      'Fecha contratación (YYYY-MM-DD)',
    ];

    const example = [
      'Ana',
      'García López',
      'EMP-001',
      'ana@empresa.com',
      '12345678A',
      '+34600000000',
      'Tecnología',
      'Desarrolladora',
      'Oficina Madrid',
      '40',
      '1234',
      '2024-01-15',
    ];

    const instructions = [
      '* Campos obligatorios',
      'El "Centro de trabajo" debe coincidir exactamente con el nombre del centro en el sistema.',
      'Si el email ya tiene usuario, no se creará uno nuevo.',
      'El PIN debe tener entre 4 y 8 dígitos numéricos.',
    ];

    const wb = XLSX.utils.book_new();

    // Sheet 1: Data
    const wsData = XLSX.utils.aoa_to_sheet([headers, example]);
    wsData['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }));
    XLSX.utils.book_append_sheet(wb, wsData, 'Empleados');

    // Sheet 2: Instructions
    const wsInfo = XLSX.utils.aoa_to_sheet([
      ['INSTRUCCIONES'],
      [],
      ...instructions.map((line) => [line]),
    ]);
    wsInfo['!cols'] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async importFromExcel(
    fileBuffer: Buffer,
    companyId: string,
    createdBy: string,
  ): Promise<{
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }> {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Archivo no válido. Asegúrate de subir un .xlsx o .xls');
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    // Remove header row; skip completely empty rows
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
    if (dataRows.length === 0) {
      throw new BadRequestException('El archivo no contiene datos de empleados');
    }

    // Pre-load work centers for this company (name → id)
    const workCenters = await this.prisma.workCenter.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
    const wcMap = new Map(workCenters.map((wc) => [wc.name.toLowerCase().trim(), wc.id]));

    const results = { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // 1-indexed + header row

      const [
        firstNameRaw, lastNameRaw, employeeCodeRaw,
        emailRaw, dniRaw, phoneRaw,
        departmentRaw, positionRaw, workCenterNameRaw,
        weeklyHoursRaw, pinRaw, hireDateRaw,
      ] = row.map((c) => String(c ?? '').trim());

      // ── Validate required fields ──────────────────────────────────────────
      if (!firstNameRaw) {
        results.errors.push({ row: rowNum, message: 'Nombre es obligatorio' });
        results.skipped++;
        continue;
      }
      if (!lastNameRaw) {
        results.errors.push({ row: rowNum, message: 'Apellidos es obligatorio' });
        results.skipped++;
        continue;
      }
      if (!employeeCodeRaw) {
        results.errors.push({ row: rowNum, message: 'Código de empleado es obligatorio' });
        results.skipped++;
        continue;
      }

      // ── Duplicate code check ──────────────────────────────────────────────
      const existing = await this.prisma.employee.findFirst({
        where: { companyId, employeeCode: employeeCodeRaw },
      });
      if (existing) {
        results.errors.push({ row: rowNum, message: `Código '${employeeCodeRaw}' ya existe` });
        results.skipped++;
        continue;
      }

      // ── Resolve work center ───────────────────────────────────────────────
      let workCenterId: string | null = null;
      if (workCenterNameRaw) {
        workCenterId = wcMap.get(workCenterNameRaw.toLowerCase()) ?? null;
        if (!workCenterId) {
          results.errors.push({
            row: rowNum,
            message: `Centro '${workCenterNameRaw}' no encontrado — empleado creado sin asignar`,
          });
        }
      }

      // ── Parse optional fields ─────────────────────────────────────────────
      const weeklyHours = parseInt(weeklyHoursRaw, 10) || 40;
      const email       = emailRaw || null;
      const dni         = dniRaw   || null;
      const phone       = phoneRaw || null;
      const department  = departmentRaw || null;
      const position    = positionRaw   || null;
      let   hireDate: Date | null = null;
      if (hireDateRaw) {
        const d = new Date(hireDateRaw);
        if (!isNaN(d.getTime())) hireDate = d;
      }

      try {
        // ── Create employee ───────────────────────────────────────────────
        const employee = await this.prisma.employee.create({
          data: {
            companyId,
            firstName: firstNameRaw,
            lastName: lastNameRaw,
            fullName: `${firstNameRaw} ${lastNameRaw}`,
            employeeCode: employeeCodeRaw,
            email,
            dni,
            phone,
            department,
            position,
            workCenterId,
            weeklyHours,
            hireDate,
            status: EmployeeStatus.ACTIVE,
            allowedMethods: [ClockMethod.EMAIL_PASSWORD, ClockMethod.PIN],
            allowMobile: true,
            allowWeb: true,
            allowKiosk: true,
            createdBy,
          },
        });

        // ── Create PIN credential ─────────────────────────────────────────
        if (pinRaw && pinRaw.length >= 4 && pinRaw.length <= 8) {
          const pinHash = await bcrypt.hash(pinRaw, 12);
          await this.prisma.employeeCredential.create({
            data: { employeeId: employee.id, method: ClockMethod.PIN, secret: pinHash },
          });
        }

        // ── Auto-create user if email provided ────────────────────────────
        if (email) {
          const existingUser = await this.prisma.user.findUnique({ where: { email } });
          if (!existingUser) {
            const tempPassword = generateTempPassword();
            const passwordHash = await bcrypt.hash(tempPassword, 12);
            await this.prisma.user.create({
              data: {
                email,
                passwordHash,
                firstName: firstNameRaw,
                lastName: lastNameRaw,
                companyId,
                role: UserRole.EMPLOYEE,
                employeeId: employee.id,
                mustChangePassword: true,
                createdBy,
              },
            });
          }
        }

        results.created++;
      } catch (err: any) {
        results.errors.push({
          row: rowNum,
          message: err?.message ?? 'Error desconocido al crear el empleado',
        });
        results.skipped++;
      }
    }

    // Audit log
    await this.audit.log({
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: 'bulk-import',
      userId: createdBy,
      companyId,
      description: `Importación masiva: ${results.created} creados, ${results.skipped} omitidos`,
    });

    return results;
  }

  async getTodayStatus(companyId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: EmployeeStatus.ACTIVE, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        workCenterId: true,
        timeEntries: {
          where: { timestamp: { gte: today } },
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    return employees.map((emp) => {
      const lastEntry = emp.timeEntries[0];
      let status = 'NOT_CLOCKED_IN';
      if (lastEntry) {
        const statusMap: Record<string, string> = {
          CHECK_IN: 'WORKING',
          CHECK_OUT: 'CLOCKED_OUT',
          BREAK_START: 'ON_BREAK',
          BREAK_END: 'WORKING',
        };
        status = statusMap[lastEntry.type] ?? 'UNKNOWN';
      }
      return {
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        workCenterId: emp.workCenterId,
        status,
        lastEntryType: lastEntry?.type,
        lastEntryTime: lastEntry?.timestamp,
      };
    });
  }
}
