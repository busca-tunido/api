# Task: Pensions and Rooms Services NoSQL Refactor

## Execution Profile

- **Wave / Batch**: Wave 4 (Domain Services Refactoring - Batch A)
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (Pensions & Rooms Domain)`
- **Dependencies (`depends_on`)**:
  - `01-mongodb-prisma-engine-and-schema-migration.md`
  - `03-mongodb-seed-pipeline-and-fixtures.md`
- **Collision Risk**: `LOW (Exclusive access to pensions and rooms modules)`

## Target Files

- **Exclusive**:
  - `src/pensions/pensions.service.ts`
  - `src/pensions/pensions.controller.ts`
  - `src/pensions/pensions.service.spec.ts`
  - `src/pensions/dto/create-pension.dto.ts`
  - `src/pensions/dto/update-pension.dto.ts`
  - `src/pensions/dto/search-pension.dto.ts`
  - `src/rooms/rooms.service.ts`
  - `src/rooms/rooms.controller.ts`
  - `src/rooms/rooms.service.spec.ts`
- **Shared / Integration Points**:
  - None

## Objective

Refactor `PensionsService` and `RoomsService` to operate natively with embedded MongoDB subdocuments (rooms, images, nearby universities) and GeoJSON spatial indexing, eliminating all relational join queries and multi-table cascades.

## Technical Specifications

### 1. `PensionsService` Query Transformation
- **No JOINs**: Queries for pension details do not require `include: { rooms: true, images: true, amenities: true }` because rooms and images reside directly in the document.
- **Geospatial Search**:
  Utilize native MongoDB geospatial filtering or bounding box calculations around GeoJSON coordinates:
  ```ts
  location: {
    coordinates: [longitude, latitude],
  }
  ```
- **Amenities Filtering**:
  Replace `pensionAmenities.some(...)` with Prisma multikey array filter:
  ```ts
  amenities: { hasEvery: selectedAmenitySlugs }
  ```

### 2. `RoomsService` Embedded Manipulation
Since rooms are subdocuments of pensions:
- **`findByPension(pensionId)`**:
  Fetches `pension.rooms` from the parent document.
- **`create(pensionId, dto, user)`**:
  Pushes a new `EmbeddedRoom` item into `pension.rooms` with a generated CUID/ObjectId.
- **`update(roomId, dto, user)`**:
  Finds the pension containing the room and updates the specific element within the `rooms` array.
- **`delete(roomId, user)`**:
  Removes or marks `deletedAt` on the embedded room element.

### 3. Response DTO Consistency
Ensure response payloads retain the exact shape expected by the frontend Next.js application so that contract breakage is 0%.

## Step-by-Step Implementation Plan

1. Update `RoomsService` methods to query and update the embedded `rooms` array on `Pension`.
2. Refactor `PensionsService` search, detail, create, and update methods to utilize embedded types and GeoPoint.
3. Update unit tests in `src/pensions/pensions.service.spec.ts` and `src/rooms/rooms.service.spec.ts`.
4. Verify endpoints with mocked PrismaService.

## Verification & Quality Gate

- `pnpm vitest run src/pensions/ src/rooms/` passes with 0 failures.
- `pnpm exec tsc --noEmit -p tsconfig.build.json` passes cleanly.
