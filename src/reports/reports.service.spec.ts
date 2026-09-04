import { NotFoundException } from '@nestjs/common';
import { ReportReason, ReportStatus, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ReportsService } from './reports.service.js';

type MockPrismaService = {
  report: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('ReportsService', () => {
  let service: ReportsService;
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
    mockPrisma = {
      report: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
      },
    };

    service = new ReportsService(mockPrisma as unknown as PrismaService);
  });

  it('should find all reports', async () => {
    mockPrisma.report.findMany.mockResolvedValue([
      { id: 'rep-1', reason: ReportReason.INACCURATE_PRICE },
    ]);

    const result = await service.findAll(ReportStatus.PENDING);
    expect(result).toHaveLength(1);
  });

  it('should create a report for valid pension', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
    mockPrisma.report.create.mockResolvedValue({ id: 'rep-1', reason: ReportReason.FRAUD_OR_SCAM });

    const result = await service.create(
      {
        pensionId: 'pension-1',
        reason: ReportReason.FRAUD_OR_SCAM,
        description: 'La publicación parece ser un fraude.',
      },
      mockUser,
    );

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
});
