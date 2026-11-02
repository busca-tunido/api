# Task: Replace AI Enrichment with Rich Situations Catalog

## Execution Profile

- **Wave / Batch**: Wave 1
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Worker Agent`
- **Dependencies (`depends_on`)**: None
- **Collision Risk**: `LOW (Isolated to seed subsystem and dependency removal)`

## Target Files

- **Exclusive**:
  - `scripts/seeds/data/seed-situations.json`
  - `scripts/seeds/generators/faker-blueprint.ts`
  - `scripts/seeds/main.ts`
  - `scripts/seeds/config.ts`
  - `scripts/seeds/types.ts`
  - `scripts/seeds/enrich.ts` (deleted)
  - `scripts/seeds/ai/*` (deleted)
- **Shared / Integration Points**:
  - `package.json` (removal of db:enrich scripts and @huggingface/transformers)

## Objective

Eliminate the AI enrichment subsystem (`scripts/seeds/ai/` and `scripts/seeds/enrich.ts`) and replace it with a comprehensive, rich situations catalog (`seed-situations.json`) containing at least 10 entries per array across all categories, titles, rooms, and review tiers. Unify the seed pipeline into a fast, single-pass execution via `pnpm db:seed`.

## Technical Specifications

1. Create `scripts/seeds/data/seed-situations.json` with >= 10 entries per array:
   - Pension title prefixes for each tier (`alta`, `media`, `baja`).
   - Pension descriptions for each tier with varied student housing vibes and placeholder interpolation (`{neighborhood}`, `{city}`, `{university}`, `{walkingMinutes}`, `{curfewRule}`, `{contactName}`).
   - Room descriptions for every type and bathroom condition (`SINGLE/PRIVATE_BATH`, `SINGLE/SHARED_BATH`, `SHARED/PRIVATE_BATH`, `SHARED/SHARED_BATH`, `STUDIO/PRIVATE_BATH`).
   - Student reviews for each star rating (1 to 5 stars), with >= 10 authentic Chilean student comments per rating tier covering varied aspects.
2. Refactor `faker-blueprint.ts` to consume `seed-situations.json` and perform dynamic interpolation and stochastic assignment.
3. Clean up `scripts/seeds/main.ts`, removing `--skip-ai` and `--fast` logic since the seed is now intrinsically instantaneous (< 2 seconds).
4. Remove `scripts/seeds/enrich.ts`, `scripts/seeds/ai/` directory, and `.cache/enriched-seed-texts.json`.
5. Remove `@huggingface/transformers` dependency using `pnpm remove @huggingface/transformers`.
6. Remove `db:enrich` and `db:enrichment` from `package.json`.
7. Ensure zero code comments, strict TypeScript types (`type` over `interface`, no `any`).

## Checklist

- [x] Create `scripts/seeds/data/seed-situations.json` with >= 10 items per array
- [x] Refactor `scripts/seeds/generators/faker-blueprint.ts` to use situations catalog
- [x] Refactor `scripts/seeds/main.ts`, `config.ts`, and `types.ts`
- [x] Remove `scripts/seeds/enrich.ts` and `scripts/seeds/ai/`
- [x] Remove `@huggingface/transformers` via `pnpm remove`
- [x] Remove `db:enrich` scripts from `package.json`
- [x] Verify formatting and linting with Biome (`pnpm run check && pnpm run review`)
- [x] Verify static typing (`pnpm exec tsc --noEmit -p tsconfig.build.json`)
- [x] Run test suite (`pnpm run test`)
- [x] Verify seed execution (`pnpm run db:seed`)

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Typecheck: `pnpm exec tsc --noEmit -p tsconfig.build.json`
- Tests: `pnpm run test`
