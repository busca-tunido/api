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

export type ReviewSummary = {
  totalReviews: number;
  averageRating: number;
  withPhotosCount: number;
  starDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages: {
    cleanliness: number;
    landlord: number;
    quietness: number;
    wifi: number;
  };
};

export type PaginatedReviews<T = unknown> = {
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
  summary?: ReviewSummary;
};

type EmbeddedPensionImageRaw = {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
};

type EmbeddedRoomRaw = {
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
};

type PensionStayRaw = {
  id: string;
  slug?: string;
  title: string;
  city: string;
  baseMonthlyPrice: number;
  images?: EmbeddedPensionImageRaw[];
  rooms?: EmbeddedRoomRaw[];
};

type ReviewUserPayload = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  university: {
    shortName: string | null;
    name: string;
  } | null;
};

type ReviewAliasedInput = {
  overallRating: number;
  isResidentVerified: boolean;
  landlordRating: number | null;
  quietnessRating: number | null;
  helpfulUserIds?: string[] | null;
  user?: ReviewUserPayload | null;
};

const REVIEW_USER_SELECT = {
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
} satisfies Prisma.UserSelect;

const REVIEW_SORT_MAP: Record<string, Prisma.ReviewOrderByWithRelationInput> = {
  oldest: { createdAt: 'asc' },
  rating_desc: { overallRating: 'desc' },
  rating_asc: { overallRating: 'asc' },
};

function buildReviewAliases<T extends ReviewAliasedInput>(review: T, currentUserId?: string) {
  const helpfulVotes = review.helpfulUserIds || [];
  return {
    ...review,
    rating: review.overallRating,
    overallRating: review.overallRating,
    isVerifiedStay: review.isResidentVerified,
    isResidentVerified: review.isResidentVerified,
    ownerRating: review.landlordRating,
    landlordRating: review.landlordRating,
    locationRating: review.quietnessRating,
    quietnessRating: review.quietnessRating,
    helpfulCount: helpfulVotes.length,
    ...(currentUserId ? { userVoted: helpfulVotes.includes(currentUserId) } : {}),
  };
}

function buildReviewSummary(
  rows: Array<{
    overallRating: number;
    cleanlinessRating: number | null;
    landlordRating: number | null;
    quietnessRating: number | null;
    wifiRating: number | null;
    images?: string[] | null;
  }>,
): ReviewSummary {
  const starDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let ratingSum = 0;
  let withPhotosCount = 0;
  let cleanSum = 0;
  let cleanCount = 0;
  let landlordSum = 0;
  let landlordCount = 0;
  let quietSum = 0;
  let quietCount = 0;
  let wifiSum = 0;
  let wifiCount = 0;

  for (const r of rows) {
    ratingSum += r.overallRating;
    const rounded = Math.round(r.overallRating);
    if (rounded >= 1 && rounded <= 5) {
      starDistribution[rounded as 1 | 2 | 3 | 4 | 5] += 1;
    }
    if (Array.isArray(r.images) && r.images.length > 0) {
      withPhotosCount += 1;
    }
    if (typeof r.cleanlinessRating === 'number' && r.cleanlinessRating > 0) {
      cleanSum += r.cleanlinessRating;
      cleanCount += 1;
    }
    if (typeof r.landlordRating === 'number' && r.landlordRating > 0) {
      landlordSum += r.landlordRating;
      landlordCount += 1;
    }
    if (typeof r.quietnessRating === 'number' && r.quietnessRating > 0) {
      quietSum += r.quietnessRating;
      quietCount += 1;
    }
    if (typeof r.wifiRating === 'number' && r.wifiRating > 0) {
      wifiSum += r.wifiRating;
      wifiCount += 1;
    }
  }

  const totalReviews = rows.length;
  return {
    totalReviews,
    averageRating: totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : 0,
    withPhotosCount,
    starDistribution,
    categoryAverages: {
      cleanliness: cleanCount > 0 ? Number((cleanSum / cleanCount).toFixed(1)) : 0,
      landlord: landlordCount > 0 ? Number((landlordSum / landlordCount).toFixed(1)) : 0,
      quietness: quietCount > 0 ? Number((quietSum / quietCount).toFixed(1)) : 0,
      wifi: wifiCount > 0 ? Number((wifiSum / wifiCount).toFixed(1)) : 0,
    },
  };
}

function formatMutatedReview<T extends ReviewAliasedInput>(review: T) {
  return {
    ...buildReviewAliases(review),
    isAnonymous: false,
    author: review.user
      ? {
          id: review.user.id,
          firstName: review.user.firstName,
          lastName: review.user.lastName,
          avatarUrl: review.user.avatarUrl,
          universityName: review.user.university?.name ?? null,
        }
      : null,
  };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOwnedReviewOrThrow(
    id: string,
    user: SanitizedUser,
    actionVerb: 'edit' | 'delete',
  ): Promise<{ id: string; userId: string; pensionId: string }> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      select: { id: true, userId: true, pensionId: true },
    });

    if (!review) {
      throw new NotFoundException(`Review '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && review.userId !== user.id) {
      throw new ForbiddenException(`You can only ${actionVerb} your own reviews`);
    }

    return review;
  }

  async findByPension(
    pensionId: string,
    filter: FilterReviewsDto = new FilterReviewsDto(),
    currentUserId?: string,
  ): Promise<PaginatedReviews> {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(filter.limit) || 10));
    const skip = (page - 1) * limit;

    const baseWhere: Prisma.ReviewWhereInput = {
      pensionId,
      isHidden: false,
      deletedAt: null,
    };

    const where: Prisma.ReviewWhereInput = {
      ...baseWhere,
      ...(filter.rating
        ? { overallRating: filter.rating }
        : filter.minRating !== undefined || filter.maxRating !== undefined
          ? {
              overallRating: {
                ...(filter.minRating !== undefined ? { gte: filter.minRating } : {}),
                ...(filter.maxRating !== undefined ? { lte: filter.maxRating } : {}),
              },
            }
          : {}),
      ...(filter.hasPhotos ? { images: { isEmpty: false } } : {}),
      ...(filter.stayDurationCategory ? { stayDurationCategory: filter.stayDurationCategory } : {}),
    };

    const orderBy = REVIEW_SORT_MAP[filter.sortBy ?? ''] ?? { createdAt: 'desc' };

    const [total, items, summaryRows] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: REVIEW_USER_SELECT },
        },
      }),
      this.prisma.review.findMany({
        where: baseWhere,
        select: {
          overallRating: true,
          cleanlinessRating: true,
          landlordRating: true,
          quietnessRating: true,
          wifiRating: true,
          images: true,
        },
      }),
    ]);

    const mappedItems = items.map((review) => ({
      ...buildReviewAliases(review, currentUserId),
      stayDuration: review.stayDurationCategory ?? null,
    }));

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
      summary: buildReviewSummary(summaryRows ?? []),
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
        pension: {
          select: {
            id: true,
            slug: true,
            title: true,
            city: true,
            baseMonthlyPrice: true,
            images: true,
            rooms: true,
          },
        },
        user: { select: REVIEW_USER_SELECT },
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
        pensionSlug: pension.slug,
        city: pension.city,
        roomTitle,
        stayDurationCategory,
        ratingGiven: review.overallRating,
        rating: review.overallRating,
        hasReview: true,
        monthlyPaidClp,
        imageUrl: featuredImage,
        featuredImage,
        comment: review.comment,
        createdAt: review.createdAt,
        review: {
          id: review.id,
          pensionId: review.pensionId,
          userId: review.userId,
          rating: review.overallRating,
          overallRating: review.overallRating,
          cleanlinessRating: review.cleanlinessRating ?? undefined,
          landlordRating: review.landlordRating ?? undefined,
          ownerRating: review.landlordRating ?? undefined,
          quietnessRating: review.quietnessRating ?? undefined,
          locationRating: review.quietnessRating ?? undefined,
          wifiRating: review.wifiRating ?? undefined,
          comment: review.comment,
          stayDurationCategory,
          isResidentVerified: review.isResidentVerified,
          isVerifiedStay: review.isResidentVerified,
          isAnonymous: false,
          helpfulCount: review.helpfulUserIds?.length || 0,
          images: review.images,
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
    const [pension, existing] = await Promise.all([
      this.prisma.pension.findUnique({
        where: { id: pensionId },
        select: { id: true },
      }),
      this.prisma.review.findFirst({
        where: {
          pensionId,
          userId: user.id,
        },
        select: { id: true },
      }),
    ]);

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    if (existing) {
      throw new ConflictException('Ya has publicado una reseña para esta pensión');
    }

    const review = await this.prisma.review.create({
      data: {
        ...dto,
        pensionId: pension.id,
        userId: user.id,
        isResidentVerified: user.isEmailVerified,
        helpfulUserIds: [],
      },
      include: {
        user: { select: REVIEW_USER_SELECT },
      },
    });

    await this.recalculatePensionRating(pension.id);

    return formatMutatedReview(review);
  }

  async update(id: string, dto: UpdateReviewDto, user: SanitizedUser): Promise<unknown> {
    const review = await this.findOwnedReviewOrThrow(id, user, 'edit');

    const updated = await this.prisma.review.update({
      where: { id },
      data: dto,
      include: {
        user: { select: REVIEW_USER_SELECT },
      },
    });

    await this.recalculatePensionRating(review.pensionId);

    return formatMutatedReview(updated);
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const review = await this.findOwnedReviewOrThrow(id, user, 'delete');

    await this.prisma.review.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.recalculatePensionRating(review.pensionId);

    return { id, deleted: true };
  }

  async recalculatePensionRating(pensionId: string): Promise<void> {
    const aggregation = await this.prisma.review.aggregate({
      where: {
        pensionId,
        isHidden: false,
        deletedAt: null,
      },
      _avg: { overallRating: true },
      _count: { id: true },
    });

    const count = aggregation._count.id;
    let average = 0;
    let communityScore = 0;

    if (count > 0) {
      average = Number((aggregation._avg.overallRating ?? 0).toFixed(2));

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
      },
    });

    return {
      helpfulCount: updatedHelpful.length,
      voted: !hasVoted,
    };
  }

  async findUserHelpfulVotes(userId: string, pensionId?: string): Promise<{ reviewIds: string[] }> {
    const reviews = await this.prisma.review.findMany({
      where: {
        helpfulUserIds: { has: userId },
        deletedAt: null,
        ...(pensionId ? { pensionId } : {}),
      },
      select: { id: true },
    });

    return {
      reviewIds: reviews.map((r) => r.id),
    };
  }
}
