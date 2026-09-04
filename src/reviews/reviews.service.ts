import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import type { UpdateReviewDto } from './dto/update-review.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPension(pensionId: string): Promise<unknown[]> {
    return this.prisma.review.findMany({
      where: {
        pensionId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            university: {
              select: {
                shortName: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async create(pensionId: string, dto: CreateReviewDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    const existing = await this.prisma.review.findUnique({
      where: {
        pensionId_userId: {
          pensionId,
          userId: user.id,
        },
      },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException('You have already reviewed this pension');
    }

    const review = await this.prisma.review.create({
      data: {
        ...dto,
        pensionId,
        userId: user.id,
        isResidentVerified: user.isEmailVerified,
      },
    });

    await this.recalculatePensionRating(pensionId);

    return review;
  }

  async update(id: string, dto: UpdateReviewDto, user: SanitizedUser): Promise<unknown> {
    const review = await this.prisma.review.findUnique({
      where: { id, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException(`Review '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && review.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    const updated = await this.prisma.review.update({
      where: { id },
      data: dto,
    });

    await this.recalculatePensionRating(review.pensionId);

    return updated;
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const review = await this.prisma.review.findUnique({
      where: { id, deletedAt: null },
    });

    if (!review) {
      throw new NotFoundException(`Review '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && review.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.recalculatePensionRating(review.pensionId);

    return { id, deleted: true };
  }

  private async recalculatePensionRating(pensionId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        pensionId,
        deletedAt: null,
      },
      select: { overallRating: true },
    });

    const count = reviews.length;
    const average =
      count === 0
        ? 0
        : Number((reviews.reduce((acc, r) => acc + r.overallRating, 0) / count).toFixed(2));

    await this.prisma.pension.update({
      where: { id: pensionId },
      data: {
        ratingAverage: average,
        ratingCount: count,
      },
    });
  }
}
