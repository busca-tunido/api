import { NotFoundException } from '@nestjs/common';
import { Role, VerificationStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ReviewsService } from '../reviews/reviews.service.js';
import { ModerationService } from './moderation.service.js';

type MockPrisma = {
  review: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

type MockReviewsService = {
  recalculatePensionRating: ReturnType<typeof vi.fn>;
};

describe('ModerationService', () => {
  let service: ModerationService;
  let mockPrisma: MockPrisma;
  let mockReviewsService: MockReviewsService;

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
      review: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockReviewsService = {
      recalculatePensionRating: vi.fn().mockResolvedValue(undefined),
    };

    service = new ModerationService(
      mockPrisma as unknown as PrismaService,
      mockReviewsService as unknown as ReviewsService,
    );
  });

  describe('updateReviewVisibility', () => {
    it('should hide review and recalculate pension rating', async () => {
      mockPrisma.review.findUnique.mockResolvedValue({
        id: 'rev-1',
        pensionId: 'pension-1',
        isHidden: false,
      });
      mockPrisma.review.update.mockResolvedValue({
        id: 'rev-1',
        pensionId: 'pension-1',
        isHidden: true,
        moderationReason: 'Lenguaje inapropiado',
        moderatedById: mockModerator.id,
      });

      const result = await service.updateReviewVisibility(
        'rev-1',
        { isHidden: true, reason: 'Lenguaje inapropiado' },
        mockModerator,
      );

      expect(mockPrisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: {
          isHidden: true,
          moderationReason: 'Lenguaje inapropiado',
          moderatedById: mockModerator.id,
        },
      });
      expect(mockReviewsService.recalculatePensionRating).toHaveBeenCalledWith('pension-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if review not found', async () => {
      mockPrisma.review.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReviewVisibility('rev-404', { isHidden: true }, mockModerator),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePensionStatus', () => {
    it('should update pension status and active state', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pension-1' });
      mockPrisma.pension.update.mockResolvedValue({
        id: 'pension-1',
        verificationStatus: VerificationStatus.COMMUNITY_VERIFIED,
        isActive: false,
      });

      const result = await service.updatePensionStatus(
        'pension-1',
        { verificationStatus: VerificationStatus.COMMUNITY_VERIFIED, isActive: false },
        mockModerator,
      );

      expect(mockPrisma.pension.update).toHaveBeenCalledWith({
        where: { id: 'pension-1' },
        data: {
          verificationStatus: VerificationStatus.COMMUNITY_VERIFIED,
          isActive: false,
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if pension not found', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePensionStatus('pension-404', { isActive: false }, mockModerator),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
