# Task: Upgrade Prisma to Latest and Migrate Schema to MongoDB Atlas

## Execution Profile

- **Wave / Batch**: Wave 1 (Database Engine & Schema Foundation)
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Lead Infrastructure Worker`
- **Dependencies (`depends_on`)**: None
- **Collision Risk**: `LOW (Foundation task; prerequisites for all subsequent domain tasks)`

## Target Files

- **Exclusive**:
  - `prisma/schema.prisma`
  - `src/prisma/prisma.service.ts`
  - `src/prisma/prisma.service.spec.ts`
  - `src/env.ts`
- **Shared / Integration Points**:
  - `.env`
  - `.env.example`

## Objective

1. Upgrade Prisma CLI and Client to `@latest` using `pnpm`, removing legacy PostgreSQL drivers (`@prisma/adapter-pg`, `pg`, `@types/pg`).
2. Migrate `prisma/schema.prisma` from PostgreSQL (`provider = "postgresql"`) to MongoDB (`provider = "mongodb"`), mapping primary keys to `@id @default(auto()) @map("_id") @db.ObjectId`.
3. Introduce composite types (`GeoPoint`, `EmbeddedPensionImage`, `EmbeddedRoom`, `EmbeddedNearbyUniversity`).
4. Update `PrismaService` to connect directly without PostgreSQL pools.
5. Push schema to MongoDB Atlas (`buscatunido_dev`) and regenerate the client.

## Technical Specifications

### 1. Dependency Management Command
Workers must execute:
```bash
pnpm -C api add @prisma/client@latest
pnpm -C api add -D prisma@latest
pnpm -C api remove @prisma/adapter-pg pg @types/pg
```

### 2. Schema Redesign (`prisma/schema.prisma`)
- Datasource:
  ```prisma
  datasource db {
    provider = "mongodb"
    url      = env("DATABASE_URL")
  }
  ```
- All model IDs:
  ```prisma
  id String @id @default(auto()) @map("_id") @db.ObjectId
  ```
- Foreign Keys:
  Must use `@db.ObjectId` (e.g., `userId String @db.ObjectId`, `pensionId String @db.ObjectId`).
- Composite types:
  ```prisma
  type GeoPoint {
    type        String   @default("Point")
    coordinates Float[]
  }

  type EmbeddedPensionImage {
    id           String   @default(cuid())
    url          String
    thumbnailUrl String
    caption      String?
    isFeatured   Boolean  @default(false)
    sortOrder    Int      @default(0)
    createdAt    DateTime @default(now())
  }

  type EmbeddedRoom {
    id                 String   @default(cuid())
    roomNumber         String?
    title              String
    description        String?
    type               String   @default("SINGLE")
    monthlyPrice       Int
    deposit            Int?
    hasPrivateBathroom Boolean  @default(false)
    totalBeds          Int      @default(1)
    availableBeds      Int      @default(1)
    isAvailable        Boolean  @default(true)
    images             String[]
    createdAt          DateTime @default(now())
    updatedAt          DateTime @default(now())
    deletedAt          DateTime?
  }

  type EmbeddedNearbyUniversity {
    universityId   String  @db.ObjectId
    name           String
    shortName      String?
    distanceMeters Int
    walkingMinutes Int?
    transitMinutes Int?
  }
  ```

### 3. Native Prisma Service Connection
Refactor `src/prisma/prisma.service.ts` to remove `pg.Pool` and `PrismaPg` adapter, utilizing standard PrismaClient lifecycle hooks (`onModuleInit`, `onModuleDestroy`).

## Step-by-Step Implementation Plan

1. Run the `pnpm` commands to update `@prisma/client` and `prisma` to `@latest` and remove `pg` adapters.
2. Replace datasource and models in `prisma/schema.prisma`.
3. Simplify `src/prisma/prisma.service.ts` to standard `PrismaClient` inheritance.
4. Run `pnpm dlx prisma db push` targeting MongoDB Atlas dev database.
5. Run `pnpm dlx prisma generate` to produce strictly typed client definitions.
6. Verify connection via unit test in `src/prisma/prisma.service.spec.ts`.

## Verification & Quality Gate

- `pnpm exec tsc --noEmit -p tsconfig.build.json` passes without type errors.
- `pnpm vitest run src/prisma/prisma.service.spec.ts` passes.
- MongoDB Atlas cluster confirms collection creation in `buscatunido_dev`.
