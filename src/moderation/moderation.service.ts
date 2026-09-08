import { Injectable, NotFoundException } from '@nestjs/common';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import type { UpdatePensionStatusDto } from './dto/update-pension-status.dto.js';
import type { UpdateReviewVisibilityDto } from './dto/update-review-visibility.dto.js';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviewsService: ReviewsService,
  ) {}

  async updateReviewVisibility(
    id: string,
    dto: UpdateReviewVisibilityDto,
    moderator: SanitizedUser,
  ): Promise<unknown> {
    const review = await this.prisma.review.findUnique({
      where: { id, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException(`Review '${id}' not found`);
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: {
        isHidden: dto.isHidden,
        moderationReason: dto.reason || null,
        moderatedById: moderator.id,
      },
    });

    await this.reviewsService.recalculatePensionRating(review.pensionId);

    return updated;
  }

  async updatePensionStatus(
    id: string,
    dto: UpdatePensionStatusDto,
    _moderator: SanitizedUser,
  ): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    return this.prisma.pension.update({
      where: { id },
      data: {
        ...(dto.verificationStatus !== undefined
          ? { verificationStatus: dto.verificationStatus }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }
}
