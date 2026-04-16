import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const centers = await prisma.workCenter.findMany({
      where: { companyId: user!.companyId, deletedAt: null },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });

    const headers = [
      'Nombre', 'Codigo', 'Ciudad', 'Direccion', 'Latitud', 'Longitud',
      'Radio geofence (m)', 'Zona horaria', 'Requiere GPS', 'Permite remoto',
      'Activo', 'N empleados', 'Fecha creacion',
    ];

    const rows = centers.map((c) => [
      c.name, c.code ?? '', c.city ?? '', c.address ?? '',
      c.latitude ?? '', c.longitude ?? '', c.radiusMeters ?? '',
      c.timezone, c.requireGps ? 'Si' : 'No', c.allowRemote ? 'Si' : 'No',
      c.isActive ? 'Activo' : 'Inactivo', c._count.employees,
      c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-ES') : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 16) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Centros de trabajo');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="centros_trabajo.xlsx"',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
