# Task: Implement Check Email Endpoint in Auth Module

## Execution Profile

- **Wave / Batch**: Wave 1
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Integrator Agent`
- **Dependencies (`depends_on`)**: None
- **Collision Risk**: `LOW (Isolated files)`

## Target Files

- **Exclusive**:
  - `src/auth/dto/check-email.dto.ts`
  - `src/auth/types/auth.types.ts`
  - `src/auth/auth.service.ts`
  - `src/auth/auth.controller.ts`
  - `src/auth/auth.service.spec.ts`

## Objective

Implement the `GET /auth/check-email` endpoint in the NestJS Auth module to verify if a student or landlord email is already registered, supporting the two-step authentication flow.

## Technical Specifications

- Create `CheckEmailDto` validating email format and normalizing with lowercase/trimming.
- Add `checkEmail(email: string): Promise<CheckEmailResponse>` in `AuthService` querying Prisma `User` model.
- Expose `@Get('check-email')` in `AuthController` with Swagger decorators.
- Return `{ exists: boolean, role?: Role }`.

## Checklist

- [x] Create `src/auth/dto/check-email.dto.ts` with validation decorators
- [x] Export `CheckEmailResponse` in `src/auth/types/auth.types.ts`
- [x] Implement `checkEmail` in `src/auth/auth.service.ts`
- [x] Expose `@Get('check-email')` in `src/auth/auth.controller.ts`
- [x] Add unit test coverage in `src/auth/auth.service.spec.ts`
- [x] Validate Biome linting and formatting with `pnpm run check && pnpm run review`
- [x] Validate test suite with `pnpm test`

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Build & Tests: `pnpm test` and `pnpm run build`
