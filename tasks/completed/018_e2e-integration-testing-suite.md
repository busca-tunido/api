# Task: End-to-End & Integration Testing Suite (`api/tasks/e2e-integration-testing-suite.md`)

## Objective

Build a comprehensive HTTP-level integration and E2E test suite using Vitest and `supertest`. Replace mock-only assertions with real HTTP request tests to validate route guards, validation pipes, transactional integrity, and database constraints.

---

## Technical Specifications

### 1. Test Configuration (`vitest.config.e2e.ts`)
- Ensure Vitest E2E config boots the real `AppModule` with validation pipes and exception filters.
- Connect to an isolated test database.

### 2. Test Suites
- **Auth & RBAC (`test/auth.e2e-spec.ts`)**:
  - Registration with duplicate email yields `409 Conflict`.
  - Registration with invalid password yields `400 Bad Request`.
  - Registration with `role: "MODERATOR"` yields `400 Bad Request`.
  - Unauthenticated access to protected routes yields `401 Unauthorized`.
- **Pensions Lifecycle (`test/pensions.e2e-spec.ts`)**:
  - Landlord creates listing (`201 Created`).
  - Student attempting to create listing yields `403 Forbidden`.
  - Non-owner attempting to patch or delete listing yields `403 Forbidden`.
  - Geospatial radius filtering returns only pensions within bounds.
- **Reviews & Rating Integrity (`test/reviews.e2e-spec.ts`)**:
  - Student submits review (`201 Created`) -> pension `ratingAverage` and `ratingCount` updated.
  - Submitting a second review on the same pension yields `409 Conflict` (uniqueness constraint).
- **Proposals & Moderation (`test/proposals.e2e-spec.ts`)**:
  - Student submits change proposal (`201 Created`).
  - Moderator approves proposal -> changes reflected in active pension listing.

---

## Checklist

- [x] Configure `vitest.config.e2e.ts` with test database setup and teardown hooks.
- [x] Implement `test/auth.e2e-spec.ts`.
- [x] Implement `test/pensions.e2e-spec.ts`.
- [x] Implement `test/reviews.e2e-spec.ts`.
- [x] Implement `test/proposals.e2e-spec.ts`.
- [x] Verify test suite passes with `pnpm run test:e2e`.
- [x] Validate code quality with Biome (`pnpm run check && pnpm run review`).

---

## Target Files

- `vitest.config.e2e.ts`
- `test/auth.e2e-spec.ts`
- `test/pensions.e2e-spec.ts`
- `test/reviews.e2e-spec.ts`
- `test/proposals.e2e-spec.ts`
