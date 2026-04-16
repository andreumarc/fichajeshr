import { prisma } from './db';
import { AuditAction } from '@prisma/client';

interface AuditLogParams {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId?: string;
  companyId?: string;
  employeeId?: string;
  before?: any;
  after?: any;
  diff?: any;
  ipAddress?: string;
  userAgent?: string;
  description?: string;
  metadata?: any;
}

export async function auditLog(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        userId: params.userId,
        companyId: params.companyId,
        before: params.before ?? undefined,
        after: params.after ?? undefined,
        diff: params.diff ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        description: params.description,
        metadata: params.metadata ?? {},
      },
    });
  } catch (err) {
    console.error('AuditLog error:', err);
  }
}
