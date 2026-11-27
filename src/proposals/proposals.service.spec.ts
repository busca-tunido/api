import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProposalStatus, ProposalType, Role } from '@prisma/sql-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import { ProposalsService } from './proposals.service.js';

type MockSqlPrisma = {
  pensionProposal: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

type MockPrisma = {
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('ProposalsService', () => {
  let service: ProposalsService;
  let mockSqlPrisma: MockSqlPrisma;
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

  const mockLandlord: SanitizedUser = {
    id: 'landlord-1',
    email: 'landlord@test.cl',
    firstName: 'Owner',
    lastName: 'One',
    phone: null,
    avatarUrl: null,
    role: Role.LANDLORD,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSqlPrisma = {
      pensionProposal: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    mockPrisma = {
      pension: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new ProposalsService(
      mockSqlPrisma as unknown as SqlPrismaService,
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('create', () => {
    it('should create proposal successfully', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockSqlPrisma.pensionProposal.create.mockResolvedValue({
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
      expect(mockSqlPrisma.pensionProposal.create).toHaveBeenCalled();
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

  describe('findByPension', () => {
    it('should return proposals for owning landlord', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: mockLandlord.id,
      });
      mockSqlPrisma.pensionProposal.findMany.mockResolvedValue([{ id: 'prop-1' }]);

      const result = await service.findByPension('pension-1', mockLandlord);
      expect(result).toEqual([{ id: 'prop-1' }]);
    });

    it('should throw ForbiddenException when non-owner landlord queries pension proposals', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'other-landlord',
      });

      await expect(service.findByPension('pension-1', mockLandlord)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('review', () => {
    it('should reject proposal with notes', async () => {
      mockSqlPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        status: ProposalStatus.PENDING,
      });
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: mockLandlord.id,
      });
      mockSqlPrisma.pensionProposal.update.mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.REJECTED,
      });

      const result = await service.review(
        'prop-1',
        { action: 'REJECT', reviewNotes: 'Datos no coinciden' },
        mockModerator,
      );

      expect(mockSqlPrisma.pensionProposal.update).toHaveBeenCalledWith(
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
      mockSqlPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        status: ProposalStatus.PENDING,
      });
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: mockLandlord.id,
      });

      await expect(service.review('prop-1', { action: 'REJECT' }, mockModerator)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should approve proposal and update pension in MongoDB then proposal in PostgreSQL', async () => {
      mockSqlPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        status: ProposalStatus.PENDING,
        proposedChanges: { curfewTime: '23:30' },
      });
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: mockLandlord.id,
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1', curfewTime: '23:30' });
      mockSqlPrisma.pensionProposal.update.mockResolvedValue({
        id: 'prop-1',
        status: ProposalStatus.APPROVED,
      });

      await service.review(
        'prop-1',
        { action: 'APPROVE', reviewNotes: 'Aprobado correctamente' },
        mockModerator,
      );

      expect(mockPrisma.pension.update).toHaveBeenCalledWith({
        where: { id: 'pension-1' },
        data: { curfewTime: '23:30' },
      });
      expect(mockSqlPrisma.pensionProposal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prop-1' },
          data: expect.objectContaining({
            status: ProposalStatus.APPROVED,
            appliedChanges: { curfewTime: '23:30' },
            reviewNotes: 'Aprobado correctamente',
            reviewedById: mockModerator.id,
          }),
        }),
      );
    });

    it('should throw BadRequestException if proposal is already resolved', async () => {
      mockSqlPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        status: ProposalStatus.APPROVED,
      });
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: mockLandlord.id,
      });

      await expect(service.review('prop-1', { action: 'APPROVE' }, mockModerator)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findModerationProposals', () => {
    it('should return OpenAPI-aligned items enriched with MongoDB pensions and pagination metadata', async () => {
      mockSqlPrisma.pensionProposal.count.mockResolvedValue(1);
      mockSqlPrisma.pensionProposal.findMany.mockResolvedValue([
        { id: 'prop-1', pensionId: 'pension-1' },
      ]);
      mockPrisma.pension.findMany.mockResolvedValue([
        { id: 'pension-1', title: 'Residencia Sur', address: 'Av. 123', city: 'Santiago' },
      ]);

      const result = await service.findModerationProposals(ProposalStatus.PENDING, 1, 20);
      expect(mockPrisma.pension.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['pension-1'] } },
        select: { id: true, title: true, address: true, city: true },
      });
      expect(result).toEqual({
        items: [
          {
            id: 'prop-1',
            pensionId: 'pension-1',
            pension: {
              id: 'pension-1',
              title: 'Residencia Sur',
              address: 'Av. 123',
              city: 'Santiago',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasMore: false,
        },
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasMore: false,
      });
    });
  });

  describe('findProposalWithDiff', () => {
    it('should compute diff between MongoDB pension and SQL proposal', async () => {
      mockSqlPrisma.pensionProposal.findUnique.mockResolvedValue({
        id: 'prop-1',
        pensionId: 'pension-1',
        proposedChanges: {
          curfewTime: '23:30',
          amenitiesToAdd: ['wifi'],
        },
      });
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        curfewTime: '22:00',
      });

      const result = await service.findProposalWithDiff('prop-1');

      expect(result).toEqual({
        proposal: {
          id: 'prop-1',
          pensionId: 'pension-1',
          proposedChanges: {
            curfewTime: '23:30',
            amenitiesToAdd: ['wifi'],
          },
          pension: {
            id: 'pension-1',
            curfewTime: '22:00',
          },
        },
        diff: {
          curfewTime: {
            current: '22:00',
            proposed: '23:30',
          },
        },
      });
    });

    it('should throw NotFoundException if proposal does not exist', async () => {
      mockSqlPrisma.pensionProposal.findUnique.mockResolvedValue(null);

      await expect(service.findProposalWithDiff('prop-404')).rejects.toThrow(NotFoundException);
    });
  });
});
