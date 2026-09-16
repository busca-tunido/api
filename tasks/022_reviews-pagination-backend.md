# Task API-022: Server-Side Pagination for Pension Reviews (`api/tasks/022_reviews-pagination-backend.md`)

## Context & Problem

In `web/src/services/reviews.service.ts` (originally specified in `web/tasks/completed/016_services-reviews-favorites-history.md`), the frontend calls `fetchPensionReviews(pensionId, query?: PaginationQuery)` passing `?page=...&limit=...` and expecting a `PaginatedReviewsResponse`.

However, the backend endpoint `GET /pensions/:pensionId/reviews` in `api/src/reviews/reviews.controller.ts` currently ignores all query parameters and fetches **all** reviews from the database (`this.prisma.review.findMany`) in a single unpaginated array. This forced the frontend to simulate pagination on the client side with `.slice(startIndex, startIndex + limit)`, causing:
1. Unnecessary database load and memory usage as review volumes grow.
2. Inability to sort or filter reviews server-side (e.g. by rating or recency).
3. Inconsistency with `GET /pensions` which uses structured `PaginatedPensionsResponse`.

---

## Role & Disjoint Files

- **Role**: Worker Agent (API Reviews & Pagination)
- **Exclusive Target Files**:
  - `api/src/reviews/dto/filter-reviews.dto.ts` (NEW)
  - `api/src/reviews/reviews.service.ts` (MODIFY)
  - `api/src/reviews/reviews.controller.ts` (MODIFY)
- **Shared / Integration Points**: None (Self-contained in reviews module).

---

## Technical Specifications

### 1. New DTO: `FilterReviewsDto` (`api/src/reviews/dto/filter-reviews.dto.ts`)

Create `FilterReviewsDto` with `class-validator` and `class-transformer`:

```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FilterReviewsDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page (1-50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5, description: 'Filter by exact overall rating' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 'newest',
    enum: ['newest', 'oldest', 'rating_desc', 'rating_asc'],
    default: 'newest',
    description: 'Sort order for reviews',
  })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'rating_desc', 'rating_asc'])
  sortBy?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' = 'newest';
}
```

### 2. Service Update: `ReviewsService.findByPension` (`api/src/reviews/reviews.service.ts`)

Define the return type interface:

```typescript
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
```

Update `findByPension` signature and query:

```typescript
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

  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = skip + limit < total;

  return {
    items,
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
```

### 3. Controller Update: `ReviewsController.findByPension` (`api/src/reviews/reviews.controller.ts`)

```typescript
@Get('pensions/:pensionId/reviews')
@ApiOperation({ summary: 'Get paginated reviews for a pension with optional rating filter and sorting' })
@ApiResponse({ status: 200, description: 'Paginated reviews response' })
async findByPension(
  @Param('pensionId') pensionId: string,
  @Query() filter: FilterReviewsDto,
): Promise<PaginatedReviews> {
  return this.reviewsService.findByPension(pensionId, filter);
}
```

---

## Worker Rules Checklist

- [ ] Worker MUST NOT execute `pnpm build`, `tsc`, `nest build`, `biome check`, or `git stash`.
- [ ] Strict TypeScript typing: No `any` type notations.
- [ ] Stage exclusively target files:
  `git add src/reviews/dto/filter-reviews.dto.ts src/reviews/reviews.service.ts src/reviews/reviews.controller.ts`
- [ ] Commit with single-line conventional commit:
  `git commit -m "feat(reviews): add server-side pagination and filters to pension reviews"`
