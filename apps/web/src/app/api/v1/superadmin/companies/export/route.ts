import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const companies = await prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { employees: true, workCenters: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Nombre', 'NIF/CIF', 'Email', 'Telefono', 'Ciudad', 'Pais',
      'Zona horaria', 'Activa', 'Empleados', 'Centros', 'Usuarios',
      'Fecha creacion',
    ];

    const rows = companies.map((c) => [
      c.name, c.taxId ?? '', c.email ?? '', c.phone ?? '', c.city ?? '',
      c.country ?? '', c.timezone ?? '',
      c.isActive ? 'Activa' : 'Inactiva',
      c._count.employees, c._count.workCenters, c._count.users,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES') : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Empresas');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="empresas.xlsx"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
