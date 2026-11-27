import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ReportStatus } from '@prisma/sql-client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { UpdateReportDto } from './dto/update-report.dto.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly sqlPrisma: SqlPrismaService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(status?: ReportStatus): Promise<unknown[]> {
    const where: Prisma.ReportWhereInput = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const reports = await this.sqlPrisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
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

    const pensionIds = Array.from(new Set(reports.map((report) => report.pensionId)));
    const pensions =
      pensionIds.length > 0
        ? await this.prisma.pension.findMany({
            where: { id: { in: pensionIds } },
            select: {
              id: true,
              title: true,
              slug: true,
            },
          })
        : [];
    const pensionMap = new Map(pensions.map((pension) => [pension.id, pension]));

    return reports.map((report) => ({
      ...report,
      pension: pensionMap.get(report.pensionId) ?? null,
    }));
  }

  async create(dto: CreateReportDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: dto.pensionId },
      select: { id: true },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${dto.pensionId}' not found`);
    }

    return this.sqlPrisma.report.create({
      data: {
        pensionId: dto.pensionId,
        userId: user.id,
        reason: dto.reason,
        description: dto.description,
      },
    });
  }

  async update(id: string, dto: UpdateReportDto): Promise<unknown> {
    const report = await this.sqlPrisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report '${id}' not found`);
    }

    return this.sqlPrisma.report.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    const report = await this.sqlPrisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException(`Report '${id}' not found`);
    }

    await this.sqlPrisma.report.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }
}
