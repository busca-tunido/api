import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma, Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReviewDto } from './dto/create-review.dto.js';
import { FilterReviewsDto } from './dto/filter-reviews.dto.js';
import type { UpdateReviewDto } from './dto/update-review.dto.js';

export interface PaginatedReviews<T = unknown> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

interface EmbeddedPensionImageRaw {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
}

interface EmbeddedRoomRaw {
  id: string;
  roomNumber?: string | null;
  title: string;
  type: string;
  monthlyPrice: number;
  deposit?: number | null;
  hasPrivateBathroom: boolean;
  totalBeds: number;
  availableBeds: number;
  isAvailable: boolean;
  images: string[];
}

interface PensionStayRaw {
  id: string;
  title: string;
  city: string;
  baseMonthlyPrice: number;
  images?: EmbeddedPensionImageRaw[];
  rooms?: EmbeddedRoomRaw[];
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPension(
    pensionId: string,
    filter: FilterReviewsDto = new FilterReviewsDto(),
  ): Promise<PaginatedReviews> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {
      pensionId,
      isHidden: false,
      deletedAt: null,
      ...(filter.rating ? { overallRating: filter.rating } : {}),
    };

    let orderBy: Prisma.ReviewOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sortBy === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (filter.sortBy === 'rating_desc') {
      orderBy = { overallRating: 'desc' };
    } else if (filter.sortBy === 'rating_asc') {
      orderBy = { overallRating: 'asc' };
    }

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy,
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
      }),
    ]);

    const mappedItems = items.map((review) => {
      const helpfulVotes = review.helpfulUserIds || [];
      return {
        ...review,
        helpfulCount: helpfulVotes.length,
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = skip + limit < total;

    return {
      items: mappedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  async findUserStays(userId: string): Promise<unknown[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        pension: true,
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
      const pension = review.pension as unknown as PensionStayRaw;
      const images = pension.images || [];
      const featuredImage =
        images.find((img) => img.isFeatured)?.url || images[0]?.url || review.images[0] || null;

      const rooms = pension.rooms || [];
      const firstRoom = rooms[0];
      const roomTitle = firstRoom?.title || pension.title;
      const monthlyPaidClp = firstRoom?.monthlyPrice
        ? Number(firstRoom.monthlyPrice)
        : Number(pension.baseMonthlyPrice) || 0;

      const stayDurationCategory = review.stayDurationCategory ?? undefined;

      return {
        id: `stay-${review.id}`,
        pensionId: review.pensionId,
        pensionTitle: pension.title,
        pensionCity: pension.city,
        roomTitle,
        stayDurationCategory,
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
          stayDurationCategory,
          isResidentVerified: review.isResidentVerified,
          images: review.images.map((url, idx) => ({ id: `rev-img-${idx}`, url })),
          createdAt: review.createdAt.toISOString(),
          user: review.user
            ? {
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
              }
            : undefined,
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

    const existing = await this.prisma.review.findFirst({
      where: {
        pensionId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('Ya has publicado una reseña para esta pensión');
    }

    const review = await this.prisma.review.create({
      data: {
        ...dto,
        pensionId,
        userId: user.id,
        isVerifiedResident: user.isEmailVerified,
        helpfulUserIds: [],
        helpfulVotesCount: 0,
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
    let average = 0;
    let communityScore = 0;

    if (count > 0) {
      const sum = reviews.reduce(
        (acc: number, r: { overallRating: number }) => acc + r.overallRating,
        0,
      );
      average = Number((sum / count).toFixed(2));

      const priorWeight = 3;
      const priorMean = 3.5;
      const bayesianRating =
        (count / (count + priorWeight)) * average +
        (priorWeight / (count + priorWeight)) * priorMean;
      communityScore = Math.round((bayesianRating / 5.0) * 1000) / 10;
    }

    await this.prisma.pension.update({
      where: { id: pensionId },
      data: {
        ratingAverage: average,
        ratingCount: count,
        communityScore,
      },
    });
  }

  async voteHelpful(id: string, userId: string): Promise<{ helpfulCount: number; voted: boolean }> {
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        deletedAt: null,
        isHidden: false,
      },
      select: { id: true, helpfulUserIds: true },
    });

    if (!review) {
      throw new NotFoundException(`Review with id '${id}' not found`);
    }

    const currentHelpful = review.helpfulUserIds || [];
    const hasVoted = currentHelpful.includes(userId);
    const updatedHelpful = hasVoted
      ? currentHelpful.filter((uid) => uid !== userId)
      : [...currentHelpful, userId];

    await this.prisma.review.update({
      where: { id },
      data: {
        helpfulUserIds: { set: updatedHelpful },
        helpfulVotesCount: updatedHelpful.length,
      },
    });

    return {
      helpfulCount: updatedHelpful.length,
      voted: !hasVoted,
    };
  }

  async findUserHelpfulVotes(userId: string): Promise<{ reviewIds: string[] }> {
    const reviews = await this.prisma.review.findMany({
      where: {
        helpfulUserIds: { has: userId },
        deletedAt: null,
      },
      select: { id: true },
    });

    return {
      reviewIds: reviews.map((r) => r.id),
    };
  }
}
