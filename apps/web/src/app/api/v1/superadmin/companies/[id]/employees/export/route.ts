import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const employees = await prisma.employee.findMany({
      where: { companyId: params.id, deletedAt: null },
      include: {
        workCenter: { select: { name: true } },
        user: { select: { email: true, isActive: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const headers = [
      'Codigo', 'Nombre', 'Apellidos', 'Email', 'Departamento',
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
