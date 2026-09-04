# Task: 001 - Initialize NestJS API Project with pnpm and Prisma

## Objective
Scaffold the base NestJS application in `api/` using `pnpm`, configure strict TypeScript, and initialize Prisma with the PostgreSQL provider.

## Checklist
- [x] Initialize NestJS project using `pnpm create @nestjs/cli` or CLI scaffolding
- [x] Install Prisma CLI and client (`pnpm add -D prisma`, `pnpm add @prisma/client`)
- [x] Initialize Prisma with PostgreSQL datasource provider
- [x] Create `.env.example` with standard PostgreSQL connection template
- [x] Set up Swagger/OpenAPI bootstrap in `src/main.ts`
- [x] Verify build and compilation with strict typing

## Verification
- Run `pnpm build`
- Run `pnpm start:dev` and confirm the server starts and Swagger is accessible
