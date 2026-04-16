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

// GET: Download import template
export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  const headers = [
    'Nombre*', 'Apellidos*', 'Codigo empleado*', 'Email', 'DNI/NIE', 'Telefono',
    'Departamento', 'Puesto', 'Centro de trabajo', 'Horas semanales',
    'PIN (4-8 digitos)', 'Fecha contratacion (YYYY-MM-DD)',
  ];
  const example = [
    'Ana', 'Garcia Lopez', 'EMP-001', 'ana@empresa.com', '12345678A',
    '+34600000000', 'Tecnologia', 'Desarrolladora', 'Oficina Madrid', '40', '1234', '2024-01-15',
  ];

  const wb = XLSX.utils.book_new();
  const wsData = XLSX.utils.aoa_to_sheet([headers, example]);
  wsData['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 20) }));
  XLSX.utils.book_append_sheet(wb, wsData, 'Empleados');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla_empleados.xlsx"',
    },
  });
}

// POST: Import employees from Excel for a specific company
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = params.id;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ message: 'No se recibio ningun archivo' }, { status: 400 });

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    let wb: XLSX.WorkBook;
    try { wb = XLSX.read(fileBuffer, { type: 'buffer' }); }
    catch { return NextResponse.json({ message: 'Archivo no valido' }, { status: 400 }); }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const dataRows = rows.slice(1).filter((r) => r.some((c) => String(c).trim() !== ''));
    if (dataRows.length === 0) {
      return NextResponse.json({ message: 'El archivo no contiene datos' }, { status: 400 });
    }

    const workCenters = await prisma.workCenter.findMany({
      where: { companyId, deletedAt: null, isActive: true },
      select: { id: true, name: true },
    });
    const wcMap = new Map(workCenters.map((wc) => [wc.name.toLowerCase().trim(), wc.id]));

    const results = { created: 0, skipped: 0, errors: [] as { row: number; message: string }[] };

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2;
      const [fn, ln, code, emailR, dniR, phoneR, deptR, posR, wcR, whR, pinR, hdR] =
        row.map((c: any) => String(c ?? '').trim());

      if (!fn) { results.errors.push({ row: rowNum, message: 'Nombre obligatorio' }); results.skipped++; continue; }
      if (!ln) { results.errors.push({ row: rowNum, message: 'Apellidos obligatorio' }); results.skipped++; continue; }
      if (!code) { results.errors.push({ row: rowNum, message: 'Codigo obligatorio' }); results.skipped++; continue; }

      const existing = await prisma.employee.findFirst({ where: { companyId, employeeCode: code } });
      if (existing) { results.errors.push({ row: rowNum, message: `Codigo '${code}' ya existe` }); results.skipped++; continue; }

      let workCenterId: string | null = null;
      if (wcR) { workCenterId = wcMap.get(wcR.toLowerCase()) ?? null; }

      try {
        const emp = await prisma.employee.create({
          data: {
            companyId, firstName: fn, lastName: ln, fullName: `${fn} ${ln}`,
            employeeCode: code, email: emailR || null, dni: dniR || null,
            phone: phoneR || null, department: deptR || null, position: posR || null,
            workCenterId, weeklyHours: parseInt(whR, 10) || 40,
            hireDate: hdR ? new Date(hdR) : null,
            status: EmployeeStatus.ACTIVE,
            allowedMethods: [ClockMethod.EMAIL_PASSWORD, ClockMethod.PIN],
            allowMobile: true, allowWeb: true, allowKiosk: true,
            createdBy: user!.sub,
          },
        });

        if (pinR && pinR.length >= 4 && pinR.length <= 8) {
          const pinHash = await bcrypt.hash(pinR, 12);
          await prisma.employeeCredential.create({
            data: { employeeId: emp.id, method: ClockMethod.PIN, secret: pinHash },
          });
        }

        if (emailR) {
          const eu = await prisma.user.findUnique({ where: { email: emailR } });
          if (!eu) {
            const tp = generateTempPassword();
            const ph = await bcrypt.hash(tp, 12);
            await prisma.user.create({
              data: {
                email: emailR, passwordHash: ph, firstName: fn, lastName: ln,
                companyId, role: UserRole.EMPLOYEE, employeeId: emp.id,
                mustChangePassword: true, createdBy: user!.sub,
              },
            });
          }
        }
        results.created++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, message: err?.message ?? 'Error desconocido' });
        results.skipped++;
      }
    }

    await auditLog({
      action: AuditAction.CREATE, entityType: 'Employee', entityId: 'bulk-import',
      userId: user!.sub, companyId,
      description: `Importacion masiva: ${results.created} creados, ${results.skipped} omitidos`,
    });

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
