# Task: Centralized Quality Gate & Vitest Test Suite on MongoDB Atlas

## Execution Profile

- **Wave / Batch**: Wave 5 (Quality Gate & System Verification)
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Quality Integrator`
- **Dependencies (`depends_on`)**:
  - `04-pensions-and-rooms-nosql-refactor.md`
  - `05-favorites-reviews-and-aggregations-refactor.md`
- **Collision Risk**: `LOW (Integration verification)`

## Target Files

- **Exclusive**:
  - `test/vitest-setup.ts`
  - `vitest.config.ts`
  - `vitest.config.e2e.ts`
- **Shared / Integration Points**:
  - Entire API codebase for linting, type-checking, and testing

## Objective

1. Configure the test environment to execute automated suites against the dedicated `buscatunido_test` database in MongoDB Atlas.
2. Execute the entire API test suite (`pnpm vitest run`) ensuring all unit, e2e, and integration tests pass without flakiness.
3. Verify global TypeScript incremental build (`pnpm exec tsc --noEmit -p tsconfig.build.json`) and Biome code formatting rules.

## Technical Specifications

### 1. Test Database Isolation
In `test/vitest-setup.ts` or environment config:
- Ensure `DATABASE_URL` during tests points to:
  `mongodb+srv://.../buscatunido_test?retryWrites=true&w=majority`
- Clean collections before/after test suites to ensure complete isolation between test runs.

### 2. End-to-End Verification Pipeline
Run the centralized verification commands:
```bash
# 1. Biome format and lint
pnpm run check

# 2. Incremental TypeScript compilation
pnpm exec tsc --noEmit -p tsconfig.build.json

# 3. Unit & Integration test suite
pnpm vitest run
```

## Step-by-Step Implementation Plan

1. Verify environment configuration for testing.
2. Run `pnpm vitest run` across the entire `api` package.
3. Address any residual contract discrepancies or type errors.
4. Run `pnpm run review` to guarantee strict Biome adherence.

## Verification & Quality Gate

- All tests pass: `Tests: XX passed`.
- TypeScript build generates 0 errors.
- Biome check reports 0 warnings or errors.
