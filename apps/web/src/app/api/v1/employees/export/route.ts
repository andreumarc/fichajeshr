import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'MANAGER', 'SUPERADMIN']);
  if (error) return error;

  try {
    const companyId = user!.companyId!;
    const employees = await prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      include: {
        workCenter: { select: { name: true } },
        user: { select: { email: true, isActive: true, lastLogin: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const headers = [
      'Codigo', 'Nombre', 'Apellidos', 'Email', 'DNI/NIE', 'Telefono',
      'Departamento', 'Puesto', 'Centro de trabajo', 'Estado',
      'Horas semanales', 'Fecha contratacion',
      'Permite movil', 'Permite web', 'Permite kiosco',
      'Acceso portal', 'Ultimo acceso',
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
      e.allowMobile ? 'Si' : 'No',
      e.allowWeb ? 'Si' : 'No',
      e.allowKiosk ? 'Si' : 'No',
      e.user ? (e.user.isActive ? 'Activo' : 'Inactivo') : 'Sin acceso',
      e.user?.lastLogin ? new Date(e.user.lastLogin).toLocaleString('es-ES') : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="empleados.xlsx"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
