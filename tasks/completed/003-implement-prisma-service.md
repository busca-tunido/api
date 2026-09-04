# Task: 003 - Implement Prisma Service with Driver Adapter & Soft Delete Extension

## Objective
Implement `PrismaService` in NestJS using Prisma 7 `@prisma/adapter-pg` driver adapter, configure global `PrismaModule`, and implement Prisma client extensions (`$extends`) for automated soft-delete filtering.

## Checklist
- [x] Create `PrismaService` with `pg.Pool` and `@prisma/adapter-pg` instantiation
- [x] Implement Prisma client extension for automated soft delete query filtering (`deletedAt: null`)
- [x] Implement graceful connection lifecycle hooks (`onModuleInit`, `onModuleDestroy`)
- [x] Create and configure global `PrismaModule` in `AppModule`
- [x] Write unit tests for `PrismaService`
- [x] Verify build and tests (`pnpm build && pnpm test`)

## Target Files
- `src/prisma/prisma.service.ts`
- `src/prisma/prisma.module.ts`
- `src/app.module.ts`

## Verification
- Command: `pnpm build && pnpm test`
