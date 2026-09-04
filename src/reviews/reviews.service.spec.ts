import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ReviewsService } from './reviews.service.js';

type MockPrismaService = {
  review: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
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
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new ReviewsService(mockPrisma as unknown as PrismaService);
  });

  describe('findByPension', () => {
    it('should return list of reviews', async () => {
      mockPrisma.review.findMany.mockResolvedValue([{ id: 'rev-1', overallRating: 5 }]);

      const result = await service.findByPension('pension-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should create review and recalculate pension rating', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockPrisma.review.findUnique.mockResolvedValue(null);
      mockPrisma.review.create.mockResolvedValue({ id: 'rev-1', overallRating: 5 });
      mockPrisma.review.findMany.mockResolvedValue([{ overallRating: 5 }]);

      const result = await service.create(
        'pension-1',
        {
          overallRating: 5,
          comment: 'Excelente ambiente y ubicación inmejorable',
        },
        mockStudent,
      );

      expect((result as { id: string }).id).toBe('rev-1');
      expect(mockPrisma.pension.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pension-1' },
          data: { ratingAverage: 5, ratingCount: 1 },
        }),
      );
    });

    it('should throw ConflictException if student already reviewed', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockPrisma.review.findUnique.mockResolvedValue({ id: 'rev-1', deletedAt: null });

      await expect(
        service.create(
          'pension-1',
          {
            overallRating: 5,
            comment: 'Excelente pensión y dormitorios',
          },
          mockStudent,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should allow author to update review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pen-1',
      });
      mockPrisma.review.update.mockResolvedValue({ id: 'rev-1', overallRating: 4 });
      mockPrisma.review.findMany.mockResolvedValue([{ overallRating: 4 }]);

      const result = await service.update('rev-1', { overallRating: 4 }, mockStudent);
      expect((result as { overallRating: number }).overallRating).toBe(4);
    });

    it('should throw ForbiddenException if user does not own review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pen-1',
      });

      await expect(service.update('rev-1', { overallRating: 4 }, mockOtherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('delete', () => {
    it('should allow author to delete review', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pen-1',
      });
      mockPrisma.review.update.mockResolvedValue({ id: 'rev-1', deletedAt: new Date() });
      mockPrisma.review.findMany.mockResolvedValue([]);

      const result = await service.delete('rev-1', mockStudent);
      expect(result.deleted).toBe(true);
    });

    it('should throw ForbiddenException if user is not author or admin', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        userId: 'student-1',
        pensionId: 'pen-1',
      });

      await expect(service.delete('rev-1', mockOtherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
