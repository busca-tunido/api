# Task: 006 - JWT Authentication, RBAC & Ownership Security

## Objective
Implement JWT-based authentication with bcrypt password hashing, registration, login, and granular authorization guards ensuring users can only access their own private data and administrators have global access.

## Checklist
- [ ] Install authentication dependencies (`@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `@types/bcrypt`, `@types/passport-jwt`)
- [ ] Create `AuthModule` with registration, login, and current user profile (`/auth/register`, `/auth/login`, `/auth/me`)
- [ ] Implement `JwtStrategy` and `JwtAuthGuard`
- [ ] Implement `RolesGuard` and `@Roles()` decorator
- [ ] Implement `OwnershipGuard` verifying entity owner matches authenticated user ID or user has ADMIN role
- [ ] Write unit tests for authentication service, strategy, and authorization guards
- [ ] Verify build and tests (`pnpm build && pnpm test && pnpm run check`)

## Target Files
- `src/auth/auth.module.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.controller.ts`
- `src/auth/strategies/jwt.strategy.ts`
- `src/auth/guards/jwt-auth.guard.ts`
- `src/auth/guards/roles.guard.ts`
- `src/auth/guards/ownership.guard.ts`

## Verification
- Command: `pnpm build && pnpm test && pnpm run check`
