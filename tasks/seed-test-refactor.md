# Task: Refactor Test Seed Script (`prisma/seed-test.ts`)

## Objective

Refactor the existing seed into `prisma/seed-test.ts` for active staging and testing environments, fetching live universities and Chilean city coordinates via external APIs with runtime validation, creating hundreds of landlords and thousands of student reviews heavily focused on top university cities, and ensuring the `favorites` table remains empty.

## Checklist

- [ ] Rename `prisma/seed.ts` to `prisma/seed-test.ts` and update `prisma.config.ts` and `package.json` (`db:seed`) to invoke `seed-test.ts`.
- [ ] Integrate external API lookup for Chilean universities with names, domains, and campus sites, adding a runtime assertion test that halts execution if university data fails to load.
- [ ] Query external API for top 100 Chilean city coordinates, adding coordinate bounds validation (Chile: lat between -56 and -17, lng between -76 and -66) and guaranteeing the presence of key cities: Santiago, Valparaíso, Concepción, and Valdivia.
- [ ] Create hundreds of simulated landlord user accounts, distributing pensions with heavy concentration in primary cities (Santiago, Valparaíso, Concepción, Valdivia) and sparse distribution elsewhere.
- [ ] Populate `rooms` table with diverse room types (single, shared, studio) and realistic price tiers.
- [ ] Link `pension_universities` with walking and transit commute estimates for pensions in primary cities.
- [ ] Create thousands of simulated student accounts associated with university email domains.
- [ ] Generate variable quantities of reviews per student, attaching a fixed image URL only to select reviews in primary cities.
- [ ] Populate moderation `reports` table for primary cities, and ensure `favorites` table is left completely empty.
- [ ] Verify test seed execution against local database and pass Biome validation.

## Target Files

- `prisma/seed-test.ts`
- `prisma.config.ts`
- `package.json`

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Build & Tests: `pnpm run build:local`
