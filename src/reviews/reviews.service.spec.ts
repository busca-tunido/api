import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ReviewsService } from './reviews.service.js';

type MockPrismaService = {
  review: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockPrisma: MockPrismaService;

  const mockStudent: SanitizedUser = {
    id: 'student-1',
    email: 'student@uchile.cl',
    firstName: 'Matías',
    lastName: 'Rojas',
    phone: null,
    avatarUrl: null,
    role: Role.STUDENT,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtherUser: SanitizedUser = {
    id: 'other-user',
    email: 'other@uchile.cl',
    firstName: 'Pedro',
    lastName: 'Gómez',
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
      review: {
        count: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new ReviewsService(mockPrisma as unknown as PrismaService);
  });

  describe('findByPension', () => {
    it('should return list of reviews with helpfulCount, userVoted, and summary', async () => {
      mockPrisma.review.count.mockResolvedValue(1);
      mockPrisma.review.findMany.mockResolvedValue([
        {
          id: 'rev-1',
          overallRating: 5,
          cleanlinessRating: 5,
          landlordRating: 4,
          quietnessRating: 5,
          wifiRating: 4,
          images: ['https://cdn.example.com/r1.webp'],
          helpfulUserIds: ['student-1'],
        },
      ]);

      const result = await service.findByPension('pension-1', undefined, 'student-1');
      expect(result.items).toHaveLength(1);
      expect((result.items[0] as { helpfulCount: number; userVoted?: boolean }).helpfulCount).toBe(
        1,
      );
      expect((result.items[0] as { userVoted?: boolean }).userVoted).toBe(true);
      expect(result.pagination.total).toBe(1);
      expect(result.summary).toEqual({
        totalReviews: 1,
        averageRating: 5,
        withPhotosCount: 1,
        starDistribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
        categoryAverages: { cleanliness: 5, landlord: 4, quietness: 5, wifi: 4 },
      });
    });
  });

  describe('create', () => {
    it('should create review and recalculate pension rating', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockPrisma.review.findFirst.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({
        id: 'rev-1',
        overallRating: 5,
        pensionId: 'pension-1',
      });
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 5 },
        _count: { id: 1 },
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1' });

      const result = await service.create(
        'pension-1',
        {
          overallRating: 5,
          comment: 'Excelente pensión',
        },
        mockStudent,
      );

      expect((result as { id: string }).id).toBe('rev-1');
      expect(mockPrisma.pension.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pension-1' },
          data: expect.objectContaining({
            ratingAverage: 5,
            ratingCount: 1,
            communityScore: expect.any(Number),
          }),
        }),
      );
    });

    it('should throw ConflictException if user already reviewed', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockPrisma.review.findFirst.mockResolvedValue({ id: 'rev-existing' });

      await expect(
        service.create('pension-1', { overallRating: 4, comment: 'Repetido' }, mockStudent),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should allow author to update review and recompute rating', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pension-1',
      });
      mockPrisma.review.update.mockResolvedValue({ id: 'rev-1', overallRating: 4 });
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { overallRating: 4 },
        _count: { id: 1 },
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1' });

      const result = await service.update('rev-1', { overallRating: 4 }, mockStudent);
      expect((result as { overallRating: number }).overallRating).toBe(4);
      expect(mockPrisma.pension.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not author', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pension-1',
      });

      await expect(service.update('rev-1', { overallRating: 3 }, mockOtherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should allow author to delete review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pension-1',
      });
      mockPrisma.review.update.mockResolvedValue({ id: 'rev-1', deletedAt: new Date() });
      mockPrisma.review.aggregate.mockResolvedValue({
        _avg: { overallRating: null },
        _count: { id: 0 },
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1' });

      const result = await service.delete('rev-1', mockStudent);
      expect(result.deleted).toBe(true);
      expect(mockPrisma.pension.update).toHaveBeenCalled();
    });
  });

  describe('voteHelpful', () => {
    it('should add userId to helpfulUserIds when not previously voted', async () => {
      mockPrisma.review.findFirst.mockResolvedValue({ id: 'rev-1', helpfulUserIds: [] });
      mockPrisma.review.update.mockResolvedValue({
        id: 'rev-1',
        helpfulUserIds: ['student-1'],
      });

      const result = await service.voteHelpful('rev-1', 'student-1');
      expect(result).toEqual({ helpfulCount: 1, voted: true });
      expect(mockPrisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-1' },
          data: {
            helpfulUserIds: { set: ['student-1'] },
          },
        }),
      );
    });

    it('should remove userId from helpfulUserIds when already voted', async () => {
      mockPrisma.review.findFirst.mockResolvedValue({
        id: 'rev-1',
        helpfulUserIds: ['student-1'],
      });
      mockPrisma.review.update.mockResolvedValue({
        id: 'rev-1',
        helpfulUserIds: [],
      });

      const result = await service.voteHelpful('rev-1', 'student-1');
      expect(result).toEqual({ helpfulCount: 0, voted: false });
      expect(mockPrisma.review.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-1' },
          data: {
            helpfulUserIds: { set: [] },
          },
        }),
      );
    });
  });

  describe('findUserHelpfulVotes', () => {
    it('should return list of reviewIds voted by user', async () => {
      mockPrisma.review.findMany.mockResolvedValue([{ id: 'rev-1' }, { id: 'rev-2' }]);

      const result = await service.findUserHelpfulVotes('student-1');
      expect(result).toEqual({ reviewIds: ['rev-1', 'rev-2'] });
    });
  });
});
