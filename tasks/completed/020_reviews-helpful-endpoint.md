# Task: Reviews Helpful Endpoint (`api/tasks/020_reviews-helpful-endpoint.md`)

## Execution Profile

- **Wave / Batch**: Wave 1
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (API)`
- **Dependencies (`depends_on`)**: `[]`
- **Collision Risk**: `LOW (Isolated reviews module endpoints)`

## Target Files

- **Exclusive**:
  - `src/reviews/reviews.controller.ts`
  - `src/reviews/reviews.service.ts`

## Objective

Implement the `POST /reviews/:id/helpful` endpoint in the NestJS API so users can upvote reviews as helpful without getting 404 errors.

## Technical Specifications

1. **Controller (`src/reviews/reviews.controller.ts`)**:
   - Add `@Post('reviews/:id/helpful')` route.
   - Decorate with `@ApiOperation({ summary: 'Vote a review as helpful' })`.
   - Accept `@Param('id') id: string`.
   - Call `this.reviewsService.voteHelpful(id)`.
   - Return `{ helpfulCount: number; voted: boolean }`.

2. **Service (`src/reviews/reviews.service.ts`)**:
   - Add `async voteHelpful(id: string): Promise<{ helpfulCount: number; voted: boolean }>`.
   - Verify review exists (`prisma.review.findUniqueOrThrow` or find with NotFoundException if deleted/hidden).
   - Return `{ helpfulCount: 1, voted: true }`.

## Checklist

- [ ] Add `POST /reviews/:id/helpful` route to `ReviewsController`.
- [ ] Implement `voteHelpful` method in `ReviewsService`.
- [ ] Follow strict typing with no `any`.
- [ ] Do NOT execute slow commands (`pnpm build`, `tsc`, `biome`).
- [ ] Stage exclusively target files and commit with `feat(reviews): add helpful vote endpoint`.
