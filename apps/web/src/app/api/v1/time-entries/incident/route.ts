import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getMeta } from '@/lib/api-auth';
import { createTimeEntry } from '@/lib/time-entries-helpers';
import { TimeEntryType } from '@prisma/client';

export async function POST(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const dto = await req.json();
    const meta = getMeta(req);
    const entry = await createTimeEntry(user!.employeeId!, user!.companyId!, dto, TimeEntryType.INCIDENT, meta);
    return NextResponse.json(entry, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
