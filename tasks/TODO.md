# Task: 005 - Global Environment Configuration & Exception Filter

## Objective
Implement strict environment variable validation and global exception filters in NestJS, ensuring consistent API error response envelopes across all modules.

## Checklist
- [ ] Implement environment variable schema validation
- [ ] Create global `HttpExceptionFilter` in `src/common/filters/`
- [ ] Create global response transform interceptor in `src/common/interceptors/`
- [ ] Configure global validation pipe and Swagger OpenAPI in `src/main.ts`
- [ ] Write unit tests for exception filter and interceptors
- [ ] Verify build and tests (`pnpm build && pnpm test`)

## Target Files
- `src/common/filters/http-exception.filter.ts`
- `src/common/interceptors/transform.interceptor.ts`
- `src/main.ts`

## Verification
- Command: `pnpm build && pnpm test`
