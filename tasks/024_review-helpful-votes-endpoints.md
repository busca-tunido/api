# Task: Review Helpful Votes Endpoints & Service Logic (`api/tasks/024_review-helpful-votes-endpoints.md`)

## Execution Profile

- **Wave / Batch**: Wave 2
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Worker Agent (API Reviews Module)`
- **Dependencies (`depends_on`)**: `[api/tasks/023_review-helpful-votes-schema.md]`
- **Collision Risk**: `LOW (Isolated reviews module)`

## Target Files

- **Exclusive**:
  - `src/reviews/reviews.controller.ts`
  - `src/reviews/reviews.service.ts`

## Objective

Implement persistent helpful voting logic in `ReviewsService` and `ReviewsController`. This includes toggling votes per user in the database, counting total votes per review in `findByPension`, and providing an endpoint to retrieve which reviews the authenticated user has marked as helpful.

## Technical Specifications

1. **`ReviewsService.voteHelpful(reviewId: string, userId: string)`**:
   - Check if the target review exists and is not deleted/hidden (`NotFoundException` if missing).
   - Check if a vote already exists in `prisma.reviewHelpfulVote`:
     - If it exists, delete it (`prisma.reviewHelpfulVote.delete`) and set `voted = false`.
     - If it does not exist, create it (`prisma.reviewHelpfulVote.create`) and set `voted = true`.
   - Count total votes: `const helpfulCount = await this.prisma.reviewHelpfulVote.count({ where: { reviewId } })`.
   - Return `{ helpfulCount, voted }`.

2. **`ReviewsService.findUserHelpfulVotes(userId: string)`**:
   - Query all votes for user: `this.prisma.reviewHelpfulVote.findMany({ where: { userId }, select: { reviewId: true } })`.
   - Return `{ reviewIds: votes.map(v => v.reviewId) }`.

3. **`ReviewsService.findByPension` Update**:
   - In `this.prisma.review.findMany`, include `_count: { select: { helpfulVotes: true } }`.
   - Map each returned review to include `helpfulCount: review._count.helpfulVotes`.

4. **`ReviewsController` Endpoints**:
   - **`POST /reviews/:id/helpful`**:
     - Decorate with `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`.
     - Accept `@Param('id') id: string` and `@CurrentUser() user: SanitizedUser`.
     - Call `this.reviewsService.voteHelpful(id, user.id)`.
     - Return `{ helpfulCount: number; voted: boolean }`.
   - **`GET /reviews/helpful/voted`**:
     - Decorate with `@UseGuards(JwtAuthGuard)` and `@ApiBearerAuth()`.
     - Accept `@CurrentUser() user: SanitizedUser`.
     - Call `this.reviewsService.findUserHelpfulVotes(user.id)`.
     - Return `{ reviewIds: string[] }`.

## Checklist

- [ ] Implement `voteHelpful(id, userId)` with database toggle logic in `ReviewsService`.
- [ ] Implement `findUserHelpfulVotes(userId)` in `ReviewsService`.
- [ ] Update `findByPension` to include `_count.helpfulVotes` in `ReviewsService`.
- [ ] Protect `POST /reviews/:id/helpful` with `JwtAuthGuard` in `ReviewsController`.
- [ ] Add `GET /reviews/helpful/voted` route in `ReviewsController`.
- [ ] Stage exclusively target files and commit with `feat(reviews): implement persistent helpful voting endpoints`.
