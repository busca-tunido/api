# Task: 002 - Define Domain Schema in Prisma

## Objective
Design and implement the comprehensive database schema in `prisma/schema.prisma` for Busca TuNido, modeling users, universities, pensiones, rooms, house rules, amenities, collaborative reviews, and community reports.

## Checklist
- [x] Define enums (Role, VerificationStatus, GenderPreference, RoomType, ReportReason, ReportStatus, AmenityCategory, StayDurationCategory)
- [x] Define core models and PostgreSQL relations in `prisma/schema.prisma`
- [x] Implement pragmatic schema optimizations (native image arrays, implicit M:N amenities, direct contacts, institutional email validation)
- [x] Optimize PostgreSQL column types (`@db.SmallInt`, `@db.Decimal`, `@db.VarChar`)
- [x] Implement database soft delete pattern (`deletedAt DateTime?` with indexes)
- [x] Configure Prisma 7 `prisma.config.ts` and remove deprecated `url` property from schema
- [x] Validate schema syntax with Prisma CLI (`pnpm exec prisma validate`)
- [x] User Review & Approval of schema design
- [x] Compile Prisma Client (`pnpm exec prisma generate`)
- [x] Verify NestJS application build (`pnpm build`)

## Target Files
- `prisma/schema.prisma`
- `prisma.config.ts`

## Verification
- Command: `pnpm exec prisma generate && pnpm build`
