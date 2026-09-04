# Task: 007 - Pensions & Rooms REST API Modules

## Objective
Implement full REST API endpoints for Pensions and Rooms with search filters, pagination, geolocation proximity calculation, and ownership-guarded mutations (landlords manage their own pensions/rooms, admins maintain global access).

## Checklist
- [ ] Create `PensionsModule` with search filters (city, university proximity, price range, amenities, gender preference)
- [ ] Implement `RoomsModule` nested under or related to pensions
- [ ] Secure mutation endpoints (`POST`, `PATCH`, `DELETE`) with `JwtAuthGuard` and `OwnershipGuard`
- [ ] Implement public read endpoints (`GET /pensions`, `GET /pensions/:slug`, `GET /pensions/:id/rooms`)
- [ ] Write unit tests for services and controllers
- [ ] Verify build and tests (`pnpm build && pnpm test && pnpm run check`)

## Target Files
- `src/pensions/`
- `src/rooms/`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
