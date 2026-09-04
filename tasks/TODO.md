# Task: 008 - Universities, Reviews, Reports & Favorites Modules

## Objective
Implement remaining REST API modules for Universities (campus data, institutional email domains), Reviews (ratings, verified resident status, average recalculation), Reports (fraud/scam moderation), and Favorites (student bookmarking) with JWT ownership protection.

## Checklist
- [ ] Create `UniversitiesModule` with city filtering and campus coordinates
- [ ] Create `ReviewsModule` with pension rating average recalculation and ownership protection (students only edit their own reviews)
- [ ] Create `ReportsModule` with reason categories and moderator/admin resolution
- [ ] Create `FavoritesModule` allowing students to bookmark and query their saved pensions
- [ ] Write unit tests for all services and controllers
- [ ] Verify build and tests (`pnpm build && pnpm test && pnpm run check`)

## Target Files
- `src/universities/`
- `src/reviews/`
- `src/reports/`
- `src/favorites/`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
