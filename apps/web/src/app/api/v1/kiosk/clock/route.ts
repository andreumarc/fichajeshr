import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMeta } from '@/lib/api-auth';
import { getLastEntry, createTimeEntry } from '@/lib/time-entries-helpers';
import { TimeEntryType, DeviceType, ClockMethod } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get('x-company-id');
    if (!companyId) {
      return NextResponse.json({ message: 'X-Company-Id header required' }, { status: 400 });
    }

    const dto = await req.json();
    const meta = getMeta(req);

    const employee = await prisma.employee.findFirst({
      where: { id: dto.employeeId, companyId, status: 'ACTIVE', allowKiosk: true },
    });
    if (!employee) return NextResponse.json({ message: 'Empleado no encontrado o no autorizado' }, { status: 404 });

    const clockDto = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      workCenterId: dto.workCenterId ?? employee.workCenterId ?? undefined,
      notes: dto.notes,
      deviceType: DeviceType.KIOSK,
      deviceId: dto.deviceId,
      clockMethod: (dto.identificationMethod ?? ClockMethod.PIN) as any,
    };

    const type = dto.type as TimeEntryType;

    // Validate state transitions
    const lastEntry = await getLastEntry(employee.id);

    if (type === TimeEntryType.CHECK_IN) {
      if (lastEntry && (lastEntry.type === TimeEntryType.CHECK_IN || lastEntry.type === TimeEntryType.BREAK_END)) {
        return NextResponse.json({ message: 'Ya hay una jornada activa' }, { status: 400 });
      }
    } else if (type === TimeEntryType.CHECK_OUT) {
      if (!lastEntry || lastEntry.type === TimeEntryType.CHECK_OUT) {
        return NextResponse.json({ message: 'No hay jornada activa' }, { status: 400 });
      }
      if (lastEntry.type === TimeEntryType.BREAK_START) {
        return NextResponse.json({ message: 'Cierra la pausa antes de fichar salida' }, { status: 400 });
      }
    } else if (type === TimeEntryType.BREAK_START) {
      if (!lastEntry || lastEntry.type === TimeEntryType.CHECK_OUT) {
        return NextResponse.json({ message: 'No hay jornada activa' }, { status: 400 });
      }
      if (lastEntry.type === TimeEntryType.BREAK_START) {
        return NextResponse.json({ message: 'Ya hay una pausa activa' }, { status: 400 });
      }
    } else if (type === TimeEntryType.BREAK_END) {
      if (!lastEntry || lastEntry.type !== TimeEntryType.BREAK_START) {
        return NextResponse.json({ message: 'No hay pausa activa' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: 'Tipo de fichaje no valido' }, { status: 400 });
    }

    const result = await createTimeEntry(employee.id, companyId, clockDto, type, meta);

    return NextResponse.json({
      success: true,
      type: dto.type,
      employeeId: employee.id,
      firstName: employee.firstName,
      timestamp: result.timestamp,
      status: result.status,
      isWithinZone: result.isWithinZone,
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
