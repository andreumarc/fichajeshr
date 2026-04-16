import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['SUPERADMIN']);
  if (error) return error;

  try {
    const entry = await prisma.timeEntry.findUnique({ where: { id: params.id } });
    if (!entry) return NextResponse.json({ message: 'Fichaje no encontrado' }, { status: 404 });

    await prisma.timeEntry.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
