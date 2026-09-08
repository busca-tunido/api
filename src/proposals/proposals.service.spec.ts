import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProposalStatus, ProposalType, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProposalsService } from './proposals.service.js';

type MockPrisma = {
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  pensionProposal: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe('ProposalsService', () => {
  let service: ProposalsService;
  let mockPrisma: MockPrisma;

  const mockUser: SanitizedUser = {
    id: 'user-student-1',
    email: 'student@uchile.cl',
    firstName: 'Student',
    lastName: 'Test',
    phone: null,
    avatarUrl: null,
    role: Role.STUDENT,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockModerator: SanitizedUser = {
    id: 'mod-1',
    email: 'mod@buscatunido.cl',
    firstName: 'Mod',
    lastName: 'Staff',
    phone: null,
    avatarUrl: null,
    role: Role.MODERATOR,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      pension: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      pensionProposal: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma)),
    };

    service = new ProposalsService(mockPrisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create proposal successfully', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockPrisma.pensionProposal.create.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        submittedById: mockUser.id,
        status: ProposalStatus.PENDING,
      });

      const result = await service.create(
        'pension-1',
        {
          type: ProposalType.BASIC_INFO,
          proposedChanges: { curfewTime: '23:30' },
          submissionNotes: 'Nuevo horario',
        },
        mockUser,
      );

      expect(mockPrisma.pension.findUnique).toHaveBeenCalledWith({
        where: { id: 'pension-1', deletedAt: null },
      });
      expect(mockPrisma.pensionProposal.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if pension does not exist', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'pension-404',
          {
            type: ProposalType.BASIC_INFO,
            proposedChanges: {},
          },
          mockUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('review', () => {
    it('should reject proposal with notes', async () => {
      mockPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        status: ProposalStatus.PENDING,
      });
      mockPrisma.pensionProposal.update.mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.REJECTED,
      });

      const result = await service.review(
        'prop-1',
        { action: 'REJECT', reviewNotes: 'Datos no coinciden' },
        mockModerator,
      );

      expect(mockPrisma.pensionProposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1' },
          data: expect.objectContaining({
            status: ProposalStatus.REJECTED,
            reviewNotes: 'Datos no coinciden',
            reviewedById: mockModerator.id,
          }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if rejecting without notes', async () => {
      mockPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.PENDING,
      });

      await expect(service.review('prop-1', { action: 'REJECT' }, mockModerator)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should approve proposal and apply direct changes in transaction', async () => {
      mockPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        status: ProposalStatus.PENDING,
        proposedChanges: { curfewTime: '23:30' },
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1', curfewTime: '23:30' });
      mockPrisma.pensionProposal.update.mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.APPROVED,
      });

      await service.review(
        'prop-1',
        { action: 'APPROVE', reviewNotes: 'Aprobado correctamente' },
        mockModerator,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.pension.update).toHaveBeenCalledWith({
        where: { id: 'pension-1' },
        data: { curfewTime: '23:30' },
      });
    });

    it('should throw BadRequestException if proposal is already resolved', async () => {
      mockPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.APPROVED,
      });

      await expect(service.review('prop-1', { action: 'APPROVE' }, mockModerator)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
