# Task: 007 - Pensions & Rooms REST API Modules

## Objective
Implement full REST API endpoints for Pensions and Rooms with search filters, pagination, geolocation proximity calculation, and ownership-guarded mutations (landlords manage their own pensions/rooms, admins maintain global access).

## Checklist
- [x] Create `PensionsModule` with search filters (city, university proximity, price range, amenities, gender preference)
- [x] Implement `RoomsModule` nested under or related to pensions
- [x] Secure mutation endpoints (`POST`, `PATCH`, `DELETE`) with `JwtAuthGuard` and `OwnershipGuard`
- [x] Implement public read endpoints (`GET /pensions`, `GET /pensions/:slug`, `GET /pensions/:id/rooms`)
- [x] Write unit tests for services and controllers
- [x] Verify build and tests (`pnpm build && pnpm test && pnpm run check`)

## Target Files
- `src/pensions/dto/filter-pensions.dto.ts`
- `src/pensions/dto/create-pension.dto.ts`
- `src/pensions/dto/update-pension.dto.ts`
- `src/pensions/pensions.service.ts`
- `src/pensions/pensions.controller.ts`
- `src/pensions/pensions.module.ts`
- `src/pensions/pensions.service.spec.ts`
- `src/rooms/dto/create-room.dto.ts`
- `src/rooms/dto/update-room.dto.ts`
- `src/rooms/rooms.service.ts`
- `src/rooms/rooms.controller.ts`
- `src/rooms/rooms.module.ts`
- `src/rooms/rooms.service.spec.ts`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
- Result: 10 test suites passed (42/42 tests), Biome check clean, NestJS build succeeded.
