import { NotFoundException } from '@nestjs/common';
import { ReportReason, ReportStatus, Role } from '@prisma/sql-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import { ReportsService } from './reports.service.js';

type MockSqlPrismaService = {
  report: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

type MockPrismaService = {
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('ReportsService', () => {
  let service: ReportsService;
  let mockSqlPrisma: MockSqlPrismaService;
  let mockPrisma: MockPrismaService;

  const mockUser: SanitizedUser = {
    id: 'user-1',
    email: 'user@test.cl',
    firstName: 'Usuario',
    lastName: 'Prueba',
    phone: null,
    avatarUrl: null,
    role: Role.STUDENT,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSqlPrisma = {
      report: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    mockPrisma = {
      pension: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new ReportsService(
      mockSqlPrisma as unknown as SqlPrismaService,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('should find all reports and attach pensions from MongoDB', async () => {
    mockSqlPrisma.report.findMany.mockResolvedValue([
      { id: 'rep-1', pensionId: 'pension-1', reason: ReportReason.INACCURATE_PRICE },
      { id: 'rep-2', pensionId: 'pension-missing', reason: ReportReason.FRAUD_OR_SCAM },
    ]);
    mockPrisma.pension.findMany.mockResolvedValue([
      { id: 'pension-1', title: 'Residencia Central', slug: 'residencia-central' },
    ]);

    const result = await service.findAll(ReportStatus.PENDING);

    expect(mockPrisma.pension.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['pension-1', 'pension-missing'] } },
      select: { id: true, title: true, slug: true },
    });
    expect(result).toEqual([
      {
        id: 'rep-1',
        pensionId: 'pension-1',
        reason: ReportReason.INACCURATE_PRICE,
        pension: { id: 'pension-1', title: 'Residencia Central', slug: 'residencia-central' },
      },
      {
        id: 'rep-2',
        pensionId: 'pension-missing',
        reason: ReportReason.FRAUD_OR_SCAM,
        pension: null,
      },
    ]);
  });

  it('should return empty array without querying MongoDB when no reports exist', async () => {
    mockSqlPrisma.report.findMany.mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([]);
    expect(mockPrisma.pension.findMany).not.toHaveBeenCalled();
  });

  it('should create a report for valid pension', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
    mockSqlPrisma.report.create.mockResolvedValue({
      id: 'rep-1',
      reason: ReportReason.FRAUD_OR_SCAM,
    });

    const result = await service.create(
      {
        pensionId: 'pension-1',
        reason: ReportReason.FRAUD_OR_SCAM,
        description: 'La publicación parece ser un fraude.',
      },
      mockUser,
    );

    expect(mockSqlPrisma.report.create).toHaveBeenCalledWith({
      data: {
        pensionId: 'pension-1',
        userId: mockUser.id,
        reason: ReportReason.FRAUD_OR_SCAM,
        description: 'La publicación parece ser un fraude.',
      },
    });
    expect((result as { id: string }).id).toBe('rep-1');
  });

  it('should throw NotFoundException when reporting non-existent pension', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        {
          pensionId: 'non-existent',
          reason: ReportReason.FRAUD_OR_SCAM,
          description: 'No existe la propiedad.',
        },
        mockUser,
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should update an existing report', async () => {
    mockSqlPrisma.report.findUnique.mockResolvedValue({ id: 'rep-1' });
    mockSqlPrisma.report.update.mockResolvedValue({
      id: 'rep-1',
      status: ReportStatus.RESOLVED,
    });

    const result = await service.update('rep-1', {
      status: ReportStatus.RESOLVED,
      resolutionNotes: 'Corregido',
    });

    expect(mockSqlPrisma.report.update).toHaveBeenCalledWith({
      where: { id: 'rep-1' },
      data: {
        status: ReportStatus.RESOLVED,
        resolutionNotes: 'Corregido',
      },
    });
    expect((result as { status: ReportStatus }).status).toBe(ReportStatus.RESOLVED);
  });

  it('should throw NotFoundException when updating non-existent report', async () => {
    mockSqlPrisma.report.findUnique.mockResolvedValue(null);

    await expect(service.update('rep-404', { status: ReportStatus.DISMISSED })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should soft delete an existing report', async () => {
    mockSqlPrisma.report.findUnique.mockResolvedValue({ id: 'rep-1' });
    mockSqlPrisma.report.update.mockResolvedValue({ id: 'rep-1', deletedAt: new Date() });

    const result = await service.delete('rep-1');

    expect(mockSqlPrisma.report.update).toHaveBeenCalledWith({
      where: { id: 'rep-1' },
      data: { deletedAt: expect.any(Date) },
    });
    expect(result).toEqual({ id: 'rep-1', deleted: true });
  });

  it('should throw NotFoundException when deleting non-existent report', async () => {
    mockSqlPrisma.report.findUnique.mockResolvedValue(null);

    await expect(service.delete('rep-404')).rejects.toThrow(NotFoundException);
    expect(mockSqlPrisma.report.update).not.toHaveBeenCalled();
  });
});
