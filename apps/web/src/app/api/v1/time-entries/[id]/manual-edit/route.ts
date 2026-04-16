import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, getMeta } from '@/lib/api-auth';
import { auditLog } from '@/lib/audit';
import { AuditAction, TimeEntryStatus } from '@prisma/client';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, error } = requireAuth(req, ['COMPANY_ADMIN', 'HR', 'SUPERADMIN']);
  if (error) return error;

  try {
    const data = await req.json();
    const meta = getMeta(req);
    const companyId = user!.companyId!;

    const entry = await prisma.timeEntry.findFirst({ where: { id: params.id, companyId } });
    if (!entry) return NextResponse.json({ message: 'Fichaje no encontrado' }, { status: 404 });

    const before = { ...entry };
    const updated = await prisma.timeEntry.update({
      where: { id: params.id },
      data: {
        ...(data.timestamp ? { timestamp: new Date(data.timestamp) } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.reviewNotes !== undefined ? { reviewNotes: data.reviewNotes } : {}),
        isManual: true,
        status: data.status ?? TimeEntryStatus.MANUAL,
        updatedBy: user!.sub,
        reviewedBy: user!.sub,
        reviewedAt: new Date(),
      },
    });

    await auditLog({
      action: AuditAction.MANUAL_EDIT,
      entityType: 'TimeEntry',
      entityId: params.id,
      userId: user!.sub,
      companyId,
      before,
      after: updated,
      diff: data,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      description: `Manual edit on TimeEntry by ${user!.sub}. Reason: ${data.reviewNotes ?? 'No reason provided'}`,
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}
