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

    return { ok: true }
  }

  private mapRole(role?: string): UserRole {
    if (role === 'superadmin') return UserRole.SUPERADMIN
    if (role === 'admin')      return UserRole.COMPANY_ADMIN
    if (role === 'hr')         return UserRole.HR
    if (role === 'manager')    return UserRole.MANAGER
    return UserRole.EMPLOYEE
  }
}
