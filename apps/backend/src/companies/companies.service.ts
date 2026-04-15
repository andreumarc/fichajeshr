import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.company.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { employees: true, workCenters: true } } },
    });
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        workCenters: { where: { deletedAt: null } },
        _count: { select: { employees: true } },
      },
    });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  create(dto: any) {
    return this.prisma.company.create({ data: dto });
  }

  update(id: string, dto: any) {
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  deactivate(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}
