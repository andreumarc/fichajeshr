import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import * as bcrypt from 'bcryptjs';
import * as XLSX from 'xlsx';
import { AuditAction, EmployeeStatus, ClockMethod, UserRole } from '@prisma/client';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// GET returns the import template
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN']);
  if (error) return error;

  const headers = [
    'Nombre*', 'Apellidos*', 'Codigo empleado*', 'Email', 'DNI/NIE', 'Telefono',
    'Departamento', 'Puesto', 'Centro de trabajo', 'Horas semanales',
    'PIN (4-8 digitos)', 'Fecha contratacion (YYYY-MM-DD)',
  ];

  const example = [
    'Ana', 'Garcia Lopez', 'EMP-001', 'ana@empresa.com', '12345678A',
    '+34600000000', 'Tecnologia', 'Desarrolladora', 'Oficina Madrid',
    '40', '1234', '2024-01-15',
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.aoa_to_sheet([headers, example]);
  wsData['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Empleados');

  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['INSTRUCCIONES'], [],
    ['* Campos obligatorios'],
    ['El "Centro de trabajo" debe coincidir exactamente con el nombre del centro en el sistema.'],
    ['Si el email ya tiene usuario, no se creara uno nuevo.'],
    ['El PIN debe tener entre 4 y 8 digitos numericos.'],
  ]);
  wsInfo['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_empleados.xlsx"',
    },
  });
}

// POST handles file upload import
export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'No se recibio ningun archivo' }, { status: 400 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch {
      return NextResponse.json({ message: 'Archivo no valido. Asegurate de subir un .xlsx o .xls' }, { status: 400 });
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
    if (dataRows.length === 0) {
      return NextResponse.json({ message: 'El archivo no contiene datos de empleados' }, { status: 400 });
    }

    // Pre-load work centers
    const workCenters = await prisma.workCenter.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
    const wcMap = new Map(workCenters.map((wc) => [wc.name.toLowerCase().trim(), wc.id]));

    const results = { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;

      const [
        firstNameRaw, lastNameRaw, employeeCodeRaw,
        emailRaw, dniRaw, phoneRaw,
        departmentRaw, positionRaw, workCenterNameRaw,
        weeklyHoursRaw, pinRaw, hireDateRaw,
      ] = row.map((c: any) => String(c ?? '').trim());

      if (!firstNameRaw) { results.errors.push({ row: rowNum, message: 'Nombre es obligatorio' }); results.skipped++; continue; }
      if (!lastNameRaw) { results.errors.push({ row: rowNum, message: 'Apellidos es obligatorio' }); results.skipped++; continue; }
      if (!employeeCodeRaw) { results.errors.push({ row: rowNum, message: 'Codigo de empleado es obligatorio' }); results.skipped++; continue; }

      const existing = await prisma.employee.findFirst({ where: { companyId, employeeCode: employeeCodeRaw } });
      if (existing) { results.errors.push({ row: rowNum, message: `Codigo '${employeeCodeRaw}' ya existe` }); results.skipped++; continue; }

      let workCenterId: string | null = null;
      if (workCenterNameRaw) {
        workCenterId = wcMap.get(workCenterNameRaw.toLowerCase()) ?? null;
        if (!workCenterId) {
          results.errors.push({ row: rowNum, message: `Centro '${workCenterNameRaw}' no encontrado — empleado creado sin asignar` });
        }
      }

      const weeklyHours = parseInt(weeklyHoursRaw, 10) || 40;
      const email = emailRaw || null;
      const dni = dniRaw || null;
      const phone = phoneRaw || null;
      const department = departmentRaw || null;
      const position = positionRaw || null;
      let hireDate: Date | null = null;
      if (hireDateRaw) { const d = new Date(hireDateRaw); if (!isNaN(d.getTime())) hireDate = d; }

      try {
        const employee = await prisma.employee.create({
          data: {
            companyId,
            firstName: firstNameRaw,
            lastName: lastNameRaw,
            fullName: `${firstNameRaw} ${lastNameRaw}`,
            employeeCode: employeeCodeRaw,
            email, dni, phone, department, position,
            workCenterId, weeklyHours, hireDate,
            status: EmployeeStatus.ACTIVE,
            allowedMethods: [ClockMethod.EMAIL_PASSWORD, ClockMethod.PIN],
            allowMobile: true, allowWeb: true, allowKiosk: true,
            createdBy: user!.sub,
          },
        });

        if (pinRaw && pinRaw.length >= 4 && pinRaw.length <= 8) {
          const pinHash = await bcrypt.hash(pinRaw, 12);
          await prisma.employeeCredential.create({
            data: { employeeId: employee.id, method: ClockMethod.PIN, secret: pinHash },
          });
        }

        if (email) {
          const existingUser = await prisma.user.findUnique({ where: { email } });
          if (!existingUser) {
            const tempPassword = generateTempPassword();
            const passwordHash = await bcrypt.hash(tempPassword, 12);
            await prisma.user.create({
              data: {
                email, passwordHash,
                firstName: firstNameRaw, lastName: lastNameRaw,
                companyId, role: UserRole.EMPLOYEE,
                employeeId: employee.id,
                mustChangePassword: true, createdBy: user!.sub,
              },
            });
          }
        }

        results.created++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, message: err?.message ?? 'Error desconocido al crear el empleado' });
        results.skipped++;
      }
    }

    await auditLog({
      action: AuditAction.CREATE,
      entityType: 'Employee',
      entityId: 'bulk-import',
      userId: user!.sub,
      companyId,
      description: `Importacion masiva: ${results.created} creados, ${results.skipped} omitidos`,
    });

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
