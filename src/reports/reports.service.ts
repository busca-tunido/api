import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ReportStatus } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { UpdateReportDto } from './dto/update-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: ReportStatus): Promise<unknown[]> {
    const where: Prisma.ReportWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        pension: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async create(dto: CreateReportDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: dto.pensionId, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${dto.pensionId}' not found`);
    }

    return this.prisma.report.create({
      data: {
        pensionId: dto.pensionId,
        userId: user.id,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateReportDto): Promise<unknown> {
    const report = await this.prisma.report.findUnique({
      where: { id, deletedAt: null },
    });

    if (!report) {
      throw new NotFoundException(`Report '${id}' not found`);
    }

    return this.prisma.report.update({
      where: { id },
      data: dto,
    });
  }
}
