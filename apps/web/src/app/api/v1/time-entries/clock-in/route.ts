import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getMeta } from '@/lib/api-auth';
import { getLastEntry, createTimeEntry } from '@/lib/time-entries-helpers';
import { TimeEntryType } from '@prisma/client';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const dto = await req.json();
    const employeeId = user!.employeeId!;
    const meta = getMeta(req);

    const lastEntry = await getLastEntry(employeeId);
    if (lastEntry) {
      if (lastEntry.type === TimeEntryType.CHECK_IN || lastEntry.type === TimeEntryType.BREAK_END) {
        return NextResponse.json({ message: 'Ya tienes una jornada activa. Ficha salida antes de volver a entrar.' }, { status: 400 });
      }
      if (lastEntry.type === TimeEntryType.BREAK_START) {
        return NextResponse.json({ message: 'Tienes una pausa activa. Finaliza la pausa antes de registrar nueva entrada.' }, { status: 400 });
      }
    }

    const entry = await createTimeEntry(employeeId, user!.companyId!, dto, TimeEntryType.CHECK_IN, meta);
    return NextResponse.json(entry, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
