import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { calculateWorkedHours } from '@/lib/time-entries-helpers';
import dayjs from 'dayjs';

export async function GET(req: NextRequest) {
  const { user, error } = requireAuth(req);
  if (error) return error;

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get('date') ?? new Date().toISOString().split('T')[0];
    const dayStart = dayjs(date).startOf('day').toDate();
    const dayEnd = dayjs(date).endOf('day').toDate();

    const entries = await prisma.timeEntry.findMany({
      where: { employeeId: user!.employeeId, timestamp: { gte: dayStart, lte: dayEnd } },
      orderBy: { timestamp: 'asc' },
    });

    return NextResponse.json(calculateWorkedHours(entries));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
