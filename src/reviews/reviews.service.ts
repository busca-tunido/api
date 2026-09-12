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
        isHidden: false,
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

  async findUserStays(userId: string): Promise<unknown[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        pension: {
          include: {
            images: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
            rooms: {
              where: { deletedAt: null },
              orderBy: { monthlyPrice: 'asc' },
            },
          },
        },
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

    return reviews.map((review) => {
      const pension = review.pension;
      const featuredImage =
        pension.images.find((img) => img.isFeatured)?.url ||
        pension.images[0]?.url ||
        review.images[0] ||
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80';

      const firstRoom = pension.rooms[0];
      const roomTitle = firstRoom?.title || 'Habitación Individual';
      const monthlyPaidClp = firstRoom?.monthlyPrice
        ? Number(firstRoom.monthlyPrice)
        : Number(pension.baseMonthlyPrice) || 280000;

      let startDateStr: string;
      let endDateStr: string;

      if (review.stayStartDate && review.stayEndDate) {
        startDateStr = review.stayStartDate.toISOString();
        endDateStr = review.stayEndDate.toISOString();
      } else {
        const endDate = new Date(review.createdAt);
        const startDate = new Date(endDate);
        switch (review.stayDurationCategory) {
          case 'ONE_YEAR':
          case 'MORE_THAN_A_YEAR':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case 'ONE_SEMESTER':
            startDate.setMonth(startDate.getMonth() - 5);
            break;
          case 'FEW_WEEKS':
            startDate.setDate(startDate.getDate() - 21);
            break;
          default:
            startDate.setDate(startDate.getDate() - 7);
            break;
        }
        startDateStr = startDate.toISOString();
        endDateStr = endDate.toISOString();
      }

      return {
        id: `stay-${review.id}`,
        pensionId: review.pensionId,
        pensionTitle: pension.title,
        pensionCity: pension.city,
        roomTitle,
        startDate: startDateStr,
        endDate: endDateStr,
        ratingGiven: review.overallRating,
        hasReview: true,
        monthlyPaidClp,
        imageUrl: featuredImage,
        review: {
          id: review.id,
          pensionId: review.pensionId,
          overallRating: review.overallRating,
          cleanlinessRating: review.cleanlinessRating ?? undefined,
          landlordRating: review.landlordRating ?? undefined,
          quietnessRating: review.quietnessRating ?? undefined,
          wifiRating: review.wifiRating ?? undefined,
          comment: review.comment,
          stayDurationCategory: review.stayDurationCategory ?? undefined,
          isResidentVerified: review.isResidentVerified,
          images: review.images.map((url, idx) => ({ id: `rev-img-${idx}`, url })),
          createdAt: review.createdAt.toISOString(),
          user: {
            id: review.user.id,
            firstName: review.user.firstName,
            lastName: review.user.lastName,
            avatarUrl: review.user.avatarUrl ?? undefined,
            university: review.user.university
              ? {
                  shortName: review.user.university.shortName ?? '',
                  name: review.user.university.name,
                }
              : undefined,
          },
        },
      };
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
      throw new ConflictException('Ya has publicado una reseña para esta pensión');
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

  async recalculatePensionRating(pensionId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        pensionId,
        isHidden: false,
        deletedAt: null,
      },
      select: { overallRating: true },
    });

    const count = reviews.length;
    const average =
      count === 0
        ? 0
        : Number(
            (
              reviews.reduce(
                (acc: number, r: { overallRating: number }) => acc + r.overallRating,
                0,
              ) / count
            ).toFixed(2),
          );

    await this.prisma.pension.update({
      where: { id: pensionId },
      data: {
        ratingAverage: average,
        ratingCount: count,
      },
    });
  }
}
