# Task: Auto-Detect and Validate University by Institutional Email Domain

## Execution Profile

- **Wave / Batch**: Wave 1 (API Institutional Identity & Registration)
- **Execution Mode**: `SEQUENTIAL`
- **Assigned Role**: `Worker Agent (API Auth & Universities)`
- **Dependencies (`depends_on`)**: None
- **Collision Risk**: `LOW (Isolated auth service and university domain lookup)`

## Target Files

- **Exclusive**:
  - `src/auth/types/auth.types.ts`
  - `src/auth/auth.service.ts`
  - `src/auth/auth.controller.ts`
  - `src/universities/universities.service.ts`
  - `src/auth/auth.service.spec.ts`
  - `src/universities/universities.service.spec.ts`
- **Shared / Integration Points**:
  - None

## Objective

Equip the backend to automatically detect and validate universities from institutional email domains (`University.emailDomains`).

1. Extend `GET /auth/check-email` to return `{ exists: boolean, detectedUniversity: DetectedUniversityDto | null }`.
2. Update the student registration routine in `AuthService.register()` to automatically bind `universityId` from the student's verified email domain, rejecting invalid non-institutional domains.

## Technical Specifications

### 1. Domain Resolution Logic (`UniversitiesService.findByEmailDomain`)
- Extract domain from email:
  ```ts
  const parts = email.toLowerCase().trim().split('@');
  const fullDomain = parts.length === 2 ? parts[1] : '';
  ```
- Subdomain fallback:
  If a student provides `nombre@alumnos.uchile.cl`, check both the exact subdomain `alumnos.uchile.cl` and parent domains `uchile.cl`.
- Prisma query using `emailDomains` array:
  ```ts
  const candidateDomains = [fullDomain];
  const domainSegments = fullDomain.split('.');
  if (domainSegments.length > 2) {
    candidateDomains.push(domainSegments.slice(1).join('.'));
  }

  const university = await this.prisma.university.findFirst({
    where: {
      deletedAt: null,
      emailDomains: { hasSome: candidateDomains },
    },
    select: {
      id: true,
      name: true,
      shortName: true,
      city: true,
      address: true,
    },
  });
  ```

### 2. Contract Extension (`src/auth/types/auth.types.ts`)
- Define `DetectedUniversityDto`:
  ```ts
  export type DetectedUniversityDto = {
    id: string;
    name: string;
    shortName: string | null;
    city: string;
  };
  ```
- Update `CheckEmailResponse`:
  ```ts
  export type CheckEmailResponse = {
    exists: boolean;
    detectedUniversity?: DetectedUniversityDto | null;
  };
  ```

### 3. Endpoint Integration (`src/auth/auth.service.ts`)
- In `checkEmail(email: string)`:
  - Check existing user in `User`.
  - If `!user`: Resolve `detectedUniversity` via `universitiesService.findByEmailDomain(normalizedEmail)`.
  - Return `{ exists: false, detectedUniversity: detectedUniversity ?? null }`.
- In `register(dto: RegisterDto)`:
  - If `dto.role === Role.STUDENT` (default):
    - Automatically lookup university via `findByEmailDomain(dto.email)`.
    - If found: Force `universityId = detectedUniversity.id`.
    - If NOT found: Throw `BadRequestException('El correo institucional no pertenece a una universidad registrada en BuscaTuNido.')`.
  - Disallow student accounts without a valid matched institutional domain.

## Checklist

- [ ] Implement `findByEmailDomain` in `src/universities/universities.service.ts` supporting direct domains and subdomains.
- [ ] Export `DetectedUniversityDto` and update `CheckEmailResponse` in `src/auth/types/auth.types.ts`.
- [ ] Update `checkEmail` in `src/auth/auth.service.ts` to return `detectedUniversity`.
- [ ] Update `register` in `src/auth/auth.service.ts` to enforce automatic university assignment from email domain for student accounts.
- [ ] Write unit tests in `src/auth/auth.service.spec.ts` validating:
  - Existing email returns `{ exists: true }`.
  - Valid institutional email returns `{ exists: false, detectedUniversity: { ... } }`.
  - Unrecognized domain returns `{ exists: false, detectedUniversity: null }`.
  - Student registration with unrecognized domain fails with `BadRequestException`.
  - Student registration with valid domain automatically binds `universityId`.
- [ ] Run Biome quality gate (`pnpm run check && pnpm run review`).
- [ ] Run decoupled typecheck (`pnpm exec tsc --noEmit -p tsconfig.build.json`).
- [ ] Run test suite (`pnpm test`).
- [ ] Stage and commit with conventional commit message (`feat(auth): auto-detect and bind university from institutional email domain`).

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Typecheck: `pnpm exec tsc --noEmit -p tsconfig.build.json`
- Tests: `pnpm run test`
