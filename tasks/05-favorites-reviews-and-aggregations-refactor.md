# Task: Favorites, Reviews and Aggregations NoSQL Refactor

## Execution Profile

- **Wave / Batch**: Wave 4 (Domain Services Refactoring - Batch B)
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (Engagement & Reviews Domain)`
- **Dependencies (`depends_on`)**:
  - `01-mongodb-prisma-engine-and-schema-migration.md`
  - `03-mongodb-seed-pipeline-and-fixtures.md`
- **Collision Risk**: `LOW (Disjoint from pensions and rooms files)`

## Target Files

- **Exclusive**:
  - `src/favorites/favorites.service.ts`
  - `src/favorites/favorites.controller.ts`
  - `src/favorites/favorites.service.spec.ts`
  - `src/reviews/reviews.service.ts`
  - `src/reviews/reviews.controller.ts`
  - `src/reviews/reviews.service.spec.ts`
  - `src/reports/reports.service.ts`
  - `src/reports/reports.service.spec.ts`
- **Shared / Integration Points**:
  - None

## Objective

1. Refactor `FavoritesService` to manage user favorites via the atomic `User.favoritePensionIds` array instead of the obsolete `favorites` join table.
2. Refactor `ReviewsService` to embed `helpfulUserIds` directly in the `Review` document and atomically recompute the parent `Pension.ratingAverage`, `Pension.ratingCount`, and `Pension.communityScore` on review submission.
3. Update `ReportsService` with ObjectId foreign keys.

## Technical Specifications

### 1. `FavoritesService` Atomic Array Operations
- **Add Favorite**:
  ```ts
  await this.prisma.user.update({
    where: { id: userId },
    data: {
      favoritePensionIds: { push: pensionId },
    },
  });
  ```
- **Remove Favorite**:
  Update `favoritePensionIds` by filtering out the ID.
- **Find User Favorites**:
  ```ts
  const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { favoritePensionIds: true } });
  return this.prisma.pension.findMany({
    where: { id: { in: user?.favoritePensionIds ?? [] }, isActive: true, deletedAt: null },
  });
  ```

### 2. `ReviewsService` Real-Time Aggregate Updates
Upon creating or moderating a review:
- Fetch all active ratings for the pension:
  ```ts
  const aggregations = await this.prisma.review.aggregate({
    where: { pensionId, isHidden: false, deletedAt: null },
    _avg: { overallRating: true },
    _count: { id: true },
  });
  ```
- Update `Pension` document atomically:
  ```ts
  await this.prisma.pension.update({
    where: { id: pensionId },
    data: {
      ratingAverage: aggregations._avg.overallRating ?? 0,
      ratingCount: aggregations._count.id ?? 0,
    },
  });
  ```
- Helpful votes toggle: Add/remove `userId` from `review.helpfulUserIds` array.

## Step-by-Step Implementation Plan

1. Refactor `FavoritesService` methods (`toggle`, `listUserFavorites`, `isFavorite`) to query `User.favoritePensionIds`.
2. Refactor `ReviewsService` helpful vote toggle to use `helpfulUserIds`.
3. Implement pension rating recalculation helper in `ReviewsService`.
4. Update unit test suites in `src/favorites/` and `src/reviews/`.

## Verification & Quality Gate

- `pnpm vitest run src/favorites/ src/reviews/ src/reports/` passes with 0 errors.
- `pnpm exec tsc --noEmit -p tsconfig.build.json` passes cleanly.
