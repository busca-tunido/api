# Task: 006 - JWT Authentication, RBAC & Ownership Security

## Objective
Implement JWT-based authentication with bcrypt password hashing, registration, login, and granular authorization guards ensuring users can only access their own private data and administrators have global access.

## Checklist
- [x] Install authentication dependencies (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcryptjs`, `@types/bcryptjs`, `@types/passport-jwt`)
- [x] Create `AuthModule` with registration, login, and current user profile (`/auth/register`, `/auth/login`, `/auth/me`)
- [x] Implement `JwtStrategy` and `JwtAuthGuard`
- [x] Implement `RolesGuard` and `@Roles()` decorator
- [x] Implement `OwnershipGuard` verifying entity owner matches authenticated user ID or user has ADMIN role
- [x] Write unit tests for authentication service, strategy, and authorization guards
- [x] Verify build and tests (`pnpm build && pnpm test && pnpm run check`)

## Target Files
- `src/auth/types/auth.types.ts`
- `src/auth/dto/register.dto.ts`
- `src/auth/dto/login.dto.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/guards/roles.guard.ts`
- `src/auth/guards/ownership.guard.ts`
- `src/auth/decorators/roles.decorator.ts`
- `src/auth/decorators/current-user.decorator.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/auth.module.ts`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
- Result: 8 test suites passed (27/27 tests), Biome check clean, NestJS build succeeded.
