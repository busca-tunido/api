# Task: High-Performance Engine Migration - SWC & Fastify (`api/tasks/swc-fastify-performance-engine.md`)

## Objective

Maximize API execution speed and developer iteration velocity:
1. Replace the default single-threaded TypeScript compiler (`tsc`) with **SWC** (Rust-based Speedy Web Compiler) in NestJS, accelerating compilation and watch mode by 10x-20x.
2. Replace the **Express** HTTP platform (`@nestjs/platform-express`) with **Fastify** (`@nestjs/platform-fastify`), doubling or tripling requests per second (req/s) and reducing JSON serialization latency under high concurrency.

---

## Technical Specifications

### 1. SWC Compiler Configuration (`nest-cli.json`)
- Suggest terminal command to install `@swc/core` and `@swc/cli` as dev dependencies:
  - `pnpm add -D -w @swc/cli @swc/core`
- Update `nest-cli.json`:
  ```json
  {
    "$schema": "https://json.schemastore.org/nest-cli",
    "collection": "@nestjs/schematics",
    "sourceRoot": "src",
    "compilerOptions": {
      "deleteOutDir": true,
      "builder": "swc",
      "typeCheck": true
    }
  }
  ```
- Verify hot reload with `pnpm run start:dev` (starts sub-second with SWC).

### 2. Fastify HTTP Engine Migration (`src/main.ts`)
- Suggest terminal command to install Fastify platform and plugins:
  - `pnpm add @nestjs/platform-fastify @fastify/cors @fastify/multipart`
- Remove `@nestjs/platform-express` and `@types/express`.
- Initialize `FastifyAdapter` in `src/main.ts`:
  ```typescript
  import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false })
  );
  ```
- Configure CORS via Fastify native plugin or `app.enableCors()`.
- Register `@fastify/multipart` for multipart/form-data support.
- Ensure Swagger UI at `/api/docs` continues functioning seamlessly with Fastify.

---

## Checklist

- [x] Suggest terminal command to install `@swc/cli`, `@swc/core`, `@nestjs/platform-fastify`, `@fastify/cors`, and `@fastify/multipart`.
- [x] Configure `"builder": "swc"` and `"typeCheck": true` in `nest-cli.json`.
- [x] Migrate `src/main.ts` from `NestFactory.create` to `NestFactory.create<NestFastifyApplication>` with `FastifyAdapter`.
- [x] Register `@fastify/multipart` and verify multipart form upload compatibility.
- [x] Verify Swagger `/api/docs` documentation UI loads correctly on Fastify.
- [x] Ensure all existing controller endpoints and validation pipes pass with Fastify.
- [x] Run test suite (`pnpm run test`) to ensure zero behavioral regressions.
- [x] Validate code quality with Biome (`pnpm run check && pnpm run review`).
- [x] Verify build with `pnpm run build`.

---

## Target Files

- `nest-cli.json`
- `src/main.ts`
- `package.json` (via dependency commands)
