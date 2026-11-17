# Context & Architectural Guidelines for AI Coding Assistants

This document provides general project context, domain rules, and development workflows for AI coding assistants contributing to **BuscaTuNido API**.

---

## 1. Project Overview & Architecture

BuscaTuNido API is a modular backend REST service built with TypeScript (Pure ESM), [NestJS](https://nestjs.com/) (Fastify adapter), and [Prisma ORM](https://www.prisma.io/) on top of [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database).

### High-Level Structure:

- `src/main.ts`: Application bootstrap, middleware, OpenAPI/Swagger setup, and global pipes, filters, and interceptors.
- `src/app.module.ts`: Root module wiring configuration, database access, and feature modules.
- `src/prisma/`: Database connectivity and lifecycle (`PrismaModule`, `PrismaService`).
- `src/common/`: Cross-cutting concerns (decorators, shared DTOs, exception filters, interceptors, error codes, and helpers).
- `src/<feature>/`: Domain feature modules placed directly under `src/`.
- `prisma/schema.prisma`: Database models, enums, indices, and embedded document structures.
- `scripts/seeds/`: Modular database seeding scripts and datasets (invoked via `prisma/seed.ts`).

### Database Management:

- `pnpm run db:seed`: Seeds MongoDB with initial catalog, universities, users, and listings.
- `pnpm run db:view`: Launches Prisma Studio for visual inspection.

---

## 2. Critical Domain Rules & Patterns

1. **No Code Comments**:
   - Comments inside code are strictly prohibited unless explicitly requested by the user. Write descriptive symbol names and explicit types instead.
2. **Pure ESM Relative Imports (`.js` Extension Required)**:
   - Because the project runs as Pure ESM with `nodenext` module resolution, all relative TypeScript imports inside `src/` and `scripts/` must include the `.js` extension.
3. **No Direct Config File Edits for Dependencies**:
   - Never modify `package.json` or lockfiles manually to install or update dependencies. Use terminal CLI commands (`pnpm add <pkg>`, `pnpm add -D <pkg>`).
4. **DTO & Payload Validation**:
   - Every incoming request must use a DTO decorated with `class-validator` and `class-transformer` rules.
   - All controller endpoints and DTO properties must have OpenAPI decorators for Swagger generation.
5. **Strict Typing (Types over Interfaces)**:
   - Use TypeScript `type` aliases exclusively; `interface` declarations are strictly forbidden.
   - Explicit return types are required on all controller methods, service methods, and helpers. `any` is strictly prohibited (prefer `unknown` or generics).
6. **Conventional Commits (Concise, Single-Line Only)**:
   - All git commit messages must strictly follow the Conventional Commits specification (`feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
   - Commit messages must be concise, single-line only, and omit any extended body description.
7. **Feature Branching & Integration to Main**:
   - Every significant change, new feature, or non-trivial bug fix must be developed within a dedicated branch (e.g., `feat/<name>`, `fix/<name>`), tested, verified, and merged cleanly into `main`. Direct uncoordinated work on `main` is prohibited for major tasks.
8. **Public Read Exploration vs. Authenticated Interactions (No Guest Accounts)**:
   - Public read-only endpoints (browsing listings, viewing details, universities, and reading reviews) may be accessed without authentication.
   - All interactive, write, or private account actions (publishing reviews, voting, submitting proposals, saving favorites, tracking stays, filing reports, uploading files, landlord management, and moderation) strictly require authenticated session JWT tokens (`JwtAuthGuard`).
   - Creating anonymous/guest user accounts or issuing synthetic guest tokens is strictly prohibited by design.
9. **Brand Naming Convention**:
   - The brand name must always be formatted as a single PascalCase token: `BuscaTuNido` (never separated as `Busca Tu Nido`).
10. **Strict Prohibition of Hardcoded Values & Seed-First Rule**:
    - Hardcoded values, dummy/mock data, synthetic fallbacks, and hardcoded heuristic dictionaries are strictly prohibited in application logic unless explicitly requested by the user.
    - Sample or testing data must live in `scripts/seeds/` or dedicated test fixtures. Endpoints and services must always query real database records, compute real values, or return clean null/empty states.
11. **100% OpenAPI Completeness & Schema Contract Rule**:
    - The backend API and OpenAPI specification must remain 100% complete and synchronized at all times.
    - Every endpoint, parameter, request body, and response payload must be exhaustively documented with OpenAPI decorators and formal DTOs (no anonymous inline schemas, untyped responses, or undocumented status codes).
    - All enums used in DTOs must specify `enumName` for canonical named schemas.
    - Any endpoint or DTO change must be followed by regenerating the OpenAPI contract (`pnpm run openapi:export` or `just openapi` from the monorepo root).

---

## 3. Execution Workflow

```bash
# PHASE 1: CONTRACT PREPARATION (Only if modifying prisma/schema.prisma)
pnpm exec prisma generate

# PHASE 2: IMPLEMENT (Pure Logic, Controllers, Services & DTOs)
# Do NOT run compilers, linters or test runners mid-implementation.

# PHASE 3: SANITIZE & FORMAT (Biome Autofix)
pnpm run check

# PHASE 4: TYPECHECK (Static Verification)
pnpm exec tsc --noEmit -p tsconfig.build.json

# PHASE 5: TEST (Vitest Unit & E2E Suites)
pnpm run test
pnpm run test:e2e

# PHASE 6: CONTRACT SYNC & EXPORT (If routes or DTOs changed)
pnpm run build && pnpm run openapi:export

# PHASE 7: COMMIT (Targeted Conventional Staging)
git add <target-files>
git commit -m "feat(module): descriptive single-line message"
```

> [!IMPORTANT]
> **Always Use Global `pnpm run <script>` (Do Not Target Individual Files)**:
> Always execute the predefined global Biome scripts (`pnpm run check`, `pnpm run review`, `pnpm run format`, `pnpm run lint`) targeting the whole repository (`.`) rather than individual files to avoid formatting or lint inconsistencies.

<!-- BEGIN:nestjs-agent-rules -->

---

## 4. NestJS & Prisma Architectural Guidelines

### Core Framework Conventions:

1. **Dependency Injection & Providers**:
   - Always inject services and repositories via constructor parameter properties: `constructor(private readonly prisma: PrismaService) {}`.
   - Providers must always be decorated with `@Injectable()`.
   - Never instantiate services manually with `new Service()`; rely on the NestJS IoC container.

2. **Modular Encapsulation**:
   - Every domain entity must reside in its own feature module directly under `src/<feature>/`.
   - Modules must explicitly declare `controllers`, `providers`, and `exports`. Keep module imports circular-dependency free.

3. **Request Lifecycle & Layering**:
   - **Controllers**: Strictly handle HTTP routing, request binding, validation, Swagger metadata, and delegation to services. Never place business logic or direct Prisma calls inside controllers.
   - **Services**: Encapsulate all business logic, authorization checks, data mutation, and orchestration.
   - **DTOs**: Mandatory for every `@Body()`, `@Query()`, and `@Param()`, combining `class-validator` / `class-transformer` rules with OpenAPI decorators.

4. **Database Access with Prisma ORM**:
   - Always inject and utilize `PrismaService` for database queries.
   - Wrap multi-step relational operations in atomic transactions (`this.prisma.$transaction(...)`).
   - Map Prisma errors cleanly (`P2002` -> `ConflictException`, `P2025` -> `NotFoundException`).

5. **Authentication, Authorization & Guards**:
   - Apply route protection declaratively with `@UseGuards(JwtAuthGuard)` (or `OptionalJwtAuthGuard` when enrichment is optional).
   - Combine `@Roles(...)` with `@UseGuards(JwtAuthGuard, RolesGuard)` for RBAC.
   - Extract the authenticated user using `@CurrentUser()`.

6. **Error Handling & HTTP Statuses**:
   - Never leak raw database error objects or stack traces to clients; throw semantic NestJS HTTP exceptions.

7. **Testing Standards**:
   - Unit tests use [Vitest](https://vitest.dev/) with `@nestjs/testing`, mocking external dependencies and `PrismaService` when testing domain services in isolation.

<!-- END:nestjs-agent-rules -->
