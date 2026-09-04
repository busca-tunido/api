# Task: 008 - Universities, Reviews, Reports & Favorites Modules

## Objective
Implement remaining REST API modules for Universities (campus data, institutional email domains), Reviews (ratings, verified resident status, average recalculation), Reports (fraud/scam moderation), and Favorites (student bookmarking) with JWT ownership protection.

## Checklist
- [x] Create `UniversitiesModule` with city filtering and campus coordinates
- [x] Create `ReviewsModule` with pension rating average recalculation and ownership protection (students only edit their own reviews)
- [x] Create `ReportsModule` with reason categories and moderator/admin resolution
- [x] Create `FavoritesModule` allowing students to bookmark and query their saved pensions
- [x] Write unit tests for all services and controllers
- [x] Verify build and tests (`pnpm build && pnpm test && pnpm run check`)

## Target Files
- `src/universities/`
- `src/reviews/`
- `src/reports/`
- `src/favorites/`
- `src/app.module.ts`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
- Result: 14 test suites passed (61/61 tests), Biome check clean, NestJS build succeeded.
