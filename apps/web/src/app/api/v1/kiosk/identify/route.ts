import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getLastEntry } from '@/lib/time-entries-helpers';
import * as bcrypt from 'bcryptjs';
import { ClockMethod } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const companyId = req.headers.get('x-company-id');
    if (!companyId) {
      return NextResponse.json({ message: 'X-Company-Id header required' }, { status: 400 });
    }

    const dto = await req.json();
    let employee: any = null;

    if (dto.method === ClockMethod.PIN || dto.method === 'PIN') {
      if (!dto.employeeCode || !dto.pin) {
        return NextResponse.json({ message: 'Codigo de empleado y PIN son obligatorios' }, { status: 400 });
      }
      employee = await prisma.employee.findFirst({
        where: { employeeCode: dto.employeeCode, companyId, status: 'ACTIVE', allowKiosk: true },
        include: {
          credentials: { where: { method: ClockMethod.PIN, isActive: true } },
          workCenter: { select: { id: true, name: true } },
        },
      });

      if (!employee) return NextResponse.json({ message: 'Empleado no encontrado o no autorizado' }, { status: 401 });

      const pinCredential = employee.credentials[0];
      if (!pinCredential) return NextResponse.json({ message: 'PIN no configurado para este empleado' }, { status: 401 });

      const isPinValid = await bcrypt.compare(dto.pin, pinCredential.secret);
      if (!isPinValid) return NextResponse.json({ message: 'PIN incorrecto' }, { status: 401 });

      await prisma.employeeCredential.update({
        where: { id: pinCredential.id },
        data: { lastUsed: new Date() },
      });
    } else if (dto.method === ClockMethod.EMPLOYEE_CODE || dto.method === 'EMPLOYEE_CODE') {
      if (!dto.employeeCode) return NextResponse.json({ message: 'Codigo de empleado obligatorio' }, { status: 400 });
      employee = await prisma.employee.findFirst({
        where: { employeeCode: dto.employeeCode, companyId, status: 'ACTIVE', allowKiosk: true },
        include: { workCenter: { select: { id: true, name: true } } },
      });
      if (!employee) return NextResponse.json({ message: 'Empleado no encontrado' }, { status: 401 });
    } else if (dto.method === ClockMethod.QR_CODE || dto.method === 'QR_CODE') {
      if (!dto.qrToken) return NextResponse.json({ message: 'Token QR requerido' }, { status: 400 });
      const credential = await prisma.employeeCredential.findFirst({
        where: { method: ClockMethod.QR_CODE, secret: dto.qrToken, isActive: true },
        include: {
          employee: { include: { workCenter: { select: { id: true, name: true } } } },
        },
      });
      if (!credential) return NextResponse.json({ message: 'QR invalido o expirado' }, { status: 401 });
      if (credential.employee.companyId !== companyId) return NextResponse.json({ message: 'QR invalido' }, { status: 401 });
      if (!credential.employee.allowKiosk) return NextResponse.json({ message: 'Kiosco no permitido para este empleado' }, { status: 403 });
      employee = credential.employee;
      await prisma.employeeCredential.update({
        where: { id: credential.id },
        data: { lastUsed: new Date() },
      });
    } else {
      return NextResponse.json({ message: 'Metodo de identificacion no soportado en kiosco' }, { status: 400 });
    }

    const lastEntry = await getLastEntry(employee.id);
    let currentStatus = 'NOT_CLOCKED_IN';
    if (lastEntry) {
      const statusMap: Record<string, string> = {
        CHECK_IN: 'WORKING', CHECK_OUT: 'CLOCKED_OUT',
        BREAK_START: 'ON_BREAK', BREAK_END: 'WORKING', INCIDENT: 'INCIDENT',
      };
      currentStatus = statusMap[lastEntry.type] ?? 'UNKNOWN';
    }

    return NextResponse.json({
      employeeId: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      workCenterId: employee.workCenterId,
      workCenterName: employee.workCenter?.name,
      currentStatus,
      lastEntry: lastEntry
        ? { type: lastEntry.type, timestamp: lastEntry.timestamp }
        : null,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
