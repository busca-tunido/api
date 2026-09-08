# Task: Moderator Actions on Reviews & Fraudulent Listings (`api/tasks/moderation-reviews-suspensions.md`)

## Objective

Equip moderators with administrative endpoints to moderate reviews (hide/unhide offensive or false reviews without destructive deletion) and suspend/delist fraudulent pensions.

---

## Technical Specifications

### 1. Schema Enhancements (`prisma/schema.prisma`)
- Add fields to `Review` model:
  - `isHidden Boolean @default(false)`
  - `moderationReason String?`
  - `moderatedById String?`
- Add index on `[isHidden]`.

### 2. Endpoints
- `PATCH /moderation/reviews/:id/visibility`:
  - Protected by `Roles(Role.MODERATOR, Role.ADMIN)`.
  - Body: `{ isHidden: boolean, reason?: string }`.
  - Exclude hidden reviews from public `GET /pensions/:id/reviews` queries and recalculate active rating averages.
- `PATCH /moderation/pensions/:id/status`:
  - Protected by `Roles(Role.MODERATOR, Role.ADMIN)`.
  - Body: `{ verificationStatus: VerificationStatus, isActive?: boolean, reason?: string }`.
  - Allows moderators to delist fake listings without being the owner.

---

## Checklist

- [ ] Update `Review` model in `prisma/schema.prisma` with `isHidden` and `moderationReason`.
- [ ] Run `prisma db push` to synchronize local database schema.
- [ ] Seed a sample moderated/hidden review in `prisma/seed-test.ts` for testing.
- [ ] Create `ModerationModule` with endpoints for reviews and pensions.
- [ ] Update `ReviewsService.findByPension()` to automatically filter out reviews where `isHidden: true`.
- [ ] Add unit tests in `src/moderation/moderation.service.spec.ts`.
- [ ] Validate code quality with Biome (`pnpm run check && pnpm run review`).
- [ ] Verify build with `pnpm exec nest build`.

---

## Target Files

- `prisma/schema.prisma`
- `prisma/seed-test.ts`
- `src/moderation/moderation.module.ts`
- `src/moderation/moderation.controller.ts`
- `src/moderation/moderation.service.ts`
- `src/reviews/reviews.service.ts`
- `src/pensions/pensions.service.ts`
- `src/app.module.ts`
