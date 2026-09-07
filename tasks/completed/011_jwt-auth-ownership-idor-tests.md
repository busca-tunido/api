# Task: Automated JWT Protection, IDOR Prevention & Cross-User Isolation Tests (`tasks/jwt-auth-ownership-idor-tests.md`)

## Objective

Implement a comprehensive automated test suite across `AuthService`, `JwtStrategy`, `OwnershipGuard`, and protected resource services and controllers (Pensions, Rooms, Reviews, Favorites, Reports) to verify that authenticated users cannot access, mutate, or leak data belonging to other users using their access tokens (Insecure Direct Object Reference / IDOR prevention, token isolation, and 401/403 HTTP guard protections).

---

## Technical Specifications

### 1. Auth Module & Token Identity Binding (`src/auth/auth.service.spec.ts`)
- **Token Payload Verification**:
  - Verify that `login()` and `register()` generate JWT access tokens embedding the exact user identity (`sub: user.id`, `email`, `role`).
  - Verify that token claims cannot be forged to represent another user ID.
- **Profile Data Isolation (`getProfile`)**:
  - Verify that `getProfile(userId)` only fetches and returns sanitized attributes for the target user (`id`, `email`, `firstName`, `lastName`, `phone`, `avatarUrl`, `role`, `isEmailVerified`, `universityId`, timestamps).
  - Verify that sensitive fields (`passwordHash`) are never exposed.
  - Verify that querying a deactivated or deleted user (`deletedAt !== null`) throws `NotFoundException`.

### 2. JWT Strategy & Token Revocation Tests (`src/auth/strategies/jwt.strategy.spec.ts`)
- Create a dedicated unit test suite for `JwtStrategy.validate(payload)`:
  - Test valid token payload resolves to active `SanitizedUser`.
  - Test deactivated/soft-deleted user account with a valid signed token throws `UnauthorizedException('User account not found or deactivated')`.
  - Test payload with non-existent `sub` ID throws `UnauthorizedException`.

### 3. Cross-User Resource Isolation in Protected Routes (IDOR Prevention)

#### A. Pensions Module (`src/pensions/pensions.service.spec.ts`)
- Test that Landlord A cannot update a pension owned by Landlord B (`ForbiddenException: You can only update your own pensions`).
- Test that Landlord A cannot delete a pension owned by Landlord B (`ForbiddenException: You can only delete your own pensions`).
- Test that an `ADMIN` user is authorized to update or delete any pension regardless of owner.
- Test that non-landlord users (`STUDENT`) are forbidden from creating pensions.

#### B. Rooms Module (`src/rooms/rooms.service.spec.ts`)
- Test that a user cannot create a room in a pension they do not own (`ForbiddenException: You can only create rooms for your own pensions`).
- Test that a user cannot update a room located in another user's pension (`ForbiddenException: You can only update rooms in your own pensions`).
- Test that a user cannot delete a room located in another user's pension (`ForbiddenException: You can only delete rooms in your own pensions`).

#### C. Reviews Module (`src/reviews/reviews.service.spec.ts`)
- Test that Student A cannot edit reviews authored by Student B (`ForbiddenException: You can only edit your own reviews`).
- Test that Student A cannot delete reviews authored by Student B (`ForbiddenException: You can only delete your own reviews`).
- Test that an `ADMIN` user is authorized to delete inappropriate reviews authored by any student.

#### D. Favorites Module (`src/favorites/favorites.service.spec.ts`)
- Test that `findAllByUser(userId)` returns strictly the favorites associated with the requesting user ID.
- Test that adding or removing a favorite with user A's token only alters user A's favorite records.

#### E. Administrative Role Isolation (`src/universities/universities.service.spec.ts`, `src/reports/reports.service.spec.ts`)
- Test that non-admin users (`STUDENT`, `LANDLORD`) cannot perform administrative modifications on universities or dispute resolutions on reports.

---

## Checklist

### Auth & Token Tests
- [ ] Extend `src/auth/auth.service.spec.ts` with explicit tests for token claim identity binding and profile boundary enforcement.
- [ ] Create `src/auth/strategies/jwt.strategy.spec.ts` testing `JwtStrategy.validate()` with active users, deactivated users (`deletedAt`), and non-existent accounts.

### IDOR & Ownership Tests
- [ ] Extend `src/pensions/pensions.service.spec.ts` with cross-user mutation tests (attempting to update/delete other landlords' pensions).
- [ ] Extend `src/rooms/rooms.service.spec.ts` with cross-pension room mutation tests.
- [ ] Extend `src/reviews/reviews.service.spec.ts` with cross-student review tampering tests.
- [ ] Extend `src/favorites/favorites.service.spec.ts` with user favorite isolation tests.
- [ ] Extend `src/auth/guards/ownership.guard.spec.ts` with edge cases for nested parameters and invalid payloads.

### Quality & Build Verification
- [ ] Run full test suite with Vitest (`pnpm run test`) ensuring 100% pass rate.
- [ ] Run Biome formatting and lint checks (`pnpm run check && pnpm run review`).
- [ ] Run NestJS production build (`pnpm exec nest build`).

---

## Target Files

- `src/auth/auth.service.spec.ts`
- `src/auth/strategies/jwt.strategy.spec.ts`
- `src/pensions/pensions.service.spec.ts`
- `src/rooms/rooms.service.spec.ts`
- `src/reviews/reviews.service.spec.ts`
- `src/favorites/favorites.service.spec.ts`
- `src/auth/guards/ownership.guard.spec.ts`

---

## Verification

- Automated Tests: `pnpm run test`
- Code Quality (Biome): `pnpm run check && pnpm run review`
- Production Build: `pnpm exec nest build`
