import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { UserRole } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertUser(
    email: string,
    name?: string,
    role?: string,
    companySlug?: string,
    clinicIds?: string[] | 'ALL',
  ): Promise<{ ok: boolean }> {
    const appRole = this.mapRole(role)
    const nameParts = (name ?? '').trim().split(' ')
    const firstName = nameParts[0] || email
    const lastName = nameParts.slice(1).join(' ') || ''

    const user = await this.prisma.user.upsert({
      where:  { email },
      update: { firstName, lastName },
      create: {
        email,
        firstName,
        lastName,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
        role: appRole,
        isActive: true,
      },
    })

    if (companySlug) {
      try {
        const company = await this.prisma.company.findUnique({ where: { slug: companySlug } })
        if (company && !user.companyId) {
          await this.prisma.user.update({
            where: { id: user.id },
            data:  { companyId: company.id },
          })
        }
      } catch { /* non-fatal */ }
    }

    // clinic_ids accepted for contract compliance.
    // Fichaje scopes work centers via Employee.workCenterId, not User directly,
    // so per-clinic scope is applied at the Employee level (future wiring).
    void clinicIds

    return { ok: true }
  }

  async listWorkCenters(): Promise<{ id: string; name: string; active: boolean }[]> {
    const rows = await this.prisma.workCenter.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return rows.map((r) => ({ id: r.id, name: r.name, active: true }))
  }

  async upsertWorkCenters(
    companySlug: string,
    clinics: { id: string; name: string; active?: boolean }[],
  ): Promise<{ ok: boolean; count: number }> {
    const company = await this.prisma.company.findUnique({ where: { slug: companySlug } })
    if (!company) return { ok: false, count: 0 }

    let count = 0
    for (const c of clinics) {
      const active = c.active !== false
      try {
        await this.prisma.workCenter.upsert({
          where: { id: c.id },
          update: { name: c.name, isActive: active, deletedAt: active ? null : new Date() },
          create: { id: c.id, name: c.name, companyId: company.id, isActive: active },
        })
        count++
      } catch { /* non-fatal */ }
    }
    return { ok: true, count }
  }

  private mapRole(role?: string): UserRole {
    if (role === 'superadmin') return UserRole.SUPERADMIN
    if (role === 'admin')      return UserRole.COMPANY_ADMIN
    if (role === 'hr')         return UserRole.HR
    if (role === 'manager')    return UserRole.MANAGER
    return UserRole.EMPLOYEE
  }
}
