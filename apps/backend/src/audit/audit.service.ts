import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    try {
      await this.prisma.auditLog.create({
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
      // Audit log errors should never crash the application
      console.error('AuditLog error:', err);
    }
  }

  async findAll(companyId: string, filters: {
    userId?: string;
    action?: AuditAction;
    entityType?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 50, ...where } = filters;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          companyId,
          ...(where.userId && { userId: where.userId }),
          ...(where.action && { action: where.action }),
          ...(where.entityType && { entityType: where.entityType }),
          ...(where.from || where.to
            ? { createdAt: { gte: where.from, lte: where.to } }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where: { companyId } }),
    ]);

    return { data, total, page, limit };
  }
}
