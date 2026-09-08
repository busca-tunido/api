# Task: DTO Strict Validation, Registration Security & Isolated Moderator Provisioning (`api/tasks/dto-strict-validation-auth-security.md`)

## Objective

Harden API request validation and authentication boundaries:
1. Restrict public user registration to prevent regular users from registering as `MODERATOR` or `ADMIN`.
2. Establish an isolated moderator provisioning mechanism (seed script or administrative CLI).
3. Add strict enum and format validations to all DTOs where free-form strings are currently allowed.

---

## Technical Specifications

### 1. Public Registration Security (`src/auth/dto/register.dto.ts`)
- Replace `@IsEnum(Role)` in `RegisterDto` with a restricted role union:
  - Allowed public roles: `Role.STUDENT` and `Role.LANDLORD`.
  - Reject `Role.MODERATOR` and `Role.ADMIN` with `400 Bad Request` during standard registration.
  - Default: `Role.STUDENT`.

### 2. Isolated Moderator Provisioning
- Create a dedicated script `src/auth/scripts/create-moderator.ts` (executable via `pnpm db:seed:mod` or CLI) accepting `email`, `password`, `firstName`, `lastName`.
- Alternatively, expose `POST /admin/moderators` protected by a high-privilege environment secret `ADMIN_MASTER_KEY` or `Role.ADMIN` session.

### 3. DTO Validation Hardening
- **`FilterPensionsDto` (`src/pensions/dto/filter-pensions.dto.ts`)**:
  - Add `@IsIn(['relevance', 'distance', 'rating', 'price_asc', 'price_desc'])` to `sortBy`.
  - Validate `amenities` query parameter items strictly.
- **`CreatePensionDto` (`src/pensions/dto/create-pension.dto.ts`)**:
  - Add `@Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Must be HH:mm 24-hour format' })` to `curfewTime`, `quietHoursStart`, and `quietHoursEnd`.
  - Validate `amenitySlugs` items matching slug format (`/^[a-z0-9-]+$/`).

### 4. JWT Guard Protection & Strict Data Ownership (IDOR Prevention)
- **Acceso Exclusivo para Usuarios Registrados**:
  - Proteger todos los endpoints de datos privados y mutaciones con `@UseGuards(JwtAuthGuard)`.
  - Cualquier solicitud sin token o con token expirado/inválido debe ser rechazada con `401 Unauthorized`.
- **Aislamiento Estricto de Datos Propios (Prevención de IDOR)**:
  - Garantizar mediante guards (`OwnershipGuard`) o validación en servicios que un usuario registrado **solo puede acceder o modificar sus propios datos**.
  - Un usuario autenticado no puede consultar favoritos ajenos, editar reseñas de otros usuarios, ni modificar pensiones o habitaciones de otros propietarios.
  - Si un usuario autenticado intenta acceder o mutar datos que pertenecen a otro usuario, la API debe rechazar la operación inmediatamente con `403 Forbidden`.

---

## Checklist

- [ ] Update `RegisterDto` in `src/auth/dto/register.dto.ts` to disallow `MODERATOR` and `ADMIN` values.
- [ ] Add unit tests in `src/auth/auth.service.spec.ts` verifying that `MODERATOR` role registration is rejected.
- [ ] Implement `pnpm db:seed:mod` script for provisioning moderator accounts independently.
- [ ] Add `@IsIn` decorator to `sortBy` in `src/pensions/dto/filter-pensions.dto.ts`.
- [ ] Add 24h time regex validation to curfew and quiet hour fields in `src/pensions/dto/create-pension.dto.ts`.
- [ ] Verify that all private/mutating routes enforce `JwtAuthGuard` rejecting unauthenticated requests with `401`.
- [ ] Implement strict ownership verification (`userId === currentUser.id`) across user, review, pension, and favorite operations, rejecting cross-user access with `403 Forbidden`.
- [ ] Add tests in `src/auth/auth.service.spec.ts` and controller specs validating IDOR prevention (user cannot access or modify resources of another user).
- [ ] Validate code formatting with Biome (`pnpm run check && pnpm run review`).
- [ ] Verify build with `pnpm exec nest build`.

---

## Target Files

- `src/auth/dto/register.dto.ts`
- `src/auth/auth.service.ts`
- `src/auth/auth.service.spec.ts`
- `src/pensions/dto/filter-pensions.dto.ts`
- `src/pensions/dto/create-pension.dto.ts`
- `prisma/seed.ts`
