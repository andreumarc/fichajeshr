import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { getLastEntry } from '@/lib/time-entries-helpers';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const lastEntry = await getLastEntry(user!.employeeId!);
    if (!lastEntry) return NextResponse.json({ status: 'NOT_CLOCKED_IN', lastEntry: null });

    const statusMap: Record<string, string> = {
      CHECK_IN: 'WORKING',
      CHECK_OUT: 'CLOCKED_OUT',
      BREAK_START: 'ON_BREAK',
      BREAK_END: 'WORKING',
      INCIDENT: 'INCIDENT',
    };

    return NextResponse.json({
      status: statusMap[lastEntry.type] ?? 'UNKNOWN',
      lastEntry,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
