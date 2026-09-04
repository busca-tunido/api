# Task: 005 - Global Environment Configuration & Exception Filter

## Objective
Implement strict environment variable validation and global exception filters in NestJS, ensuring consistent API error response envelopes across all modules.

## Checklist
- [x] Implement environment variable schema validation
- [x] Create global `HttpExceptionFilter` in `src/common/filters/`
- [x] Create global response transform interceptor in `src/common/interceptors/`
- [x] Configure global validation pipe and Swagger OpenAPI in `src/main.ts`
- [x] Write unit tests for exception filter and interceptors
- [x] Verify build and tests (`pnpm build && pnpm test`)

## Target Files
- `src/common/config/env.validation.ts`
- `src/common/filters/http-exception.filter.ts`
- `src/common/interceptors/transform.interceptor.ts`
- `src/main.ts`
- `src/app.module.ts`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
- Result: All 5 test suites passed (13/13 tests), Biome check clean, NestJS build succeeded.
