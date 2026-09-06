# Task: Production Seed Script Architecture (`prisma/seed.ts`) & Shared Utils

## Objective

Create a production-ready seed script (`prisma/seed.ts`) and shared utility module (`prisma/seed-utils.ts`) that populates only authentic Chilean public data (amenities, universities, official city coordinates, and real public pension listings), strictly excluding all fake users, fake reviews, fake reports, and fake favorites, and failing fast if mandatory external datasets cannot be reached.

## Checklist

- [ ] Create `prisma/seed-utils.ts` and extract shared logic (university API queries, coordinate assertions, and database helpers) from `seed-test.ts`.
- [ ] Create `prisma/seed.ts` reserved exclusively for clean production onboarding.
- [ ] Query external APIs for Chilean universities and canonical city boundaries with strict runtime failure assertions.
- [ ] Seed official platform catalog (the 19 core amenities and their standardized icons/categories).
- [ ] Ingest real public pension listings, configuring unclaimed/unverified ownership for pensions without a registered landlord account.
- [ ] Ensure strict exclusion of all synthetic data (zero fake students, zero fake landlords, zero fake admins, zero fake reviews, zero fake reports, zero fake favorites).
- [ ] Verify script architecture, strict TypeScript types, and code formatting.

## Target Files

- `prisma/seed.ts`
- `prisma/seed-utils.ts`
- `prisma/seed-test.ts`

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Build & Tests: `pnpm run build:local`
