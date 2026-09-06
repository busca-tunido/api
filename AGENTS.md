# Context & Architectural Guidelines for AI Coding Assistants

This document provides essential architectural context, domain patterns, and development guidelines for AI coding assistants contributing to **BuscaTuNido API**.

---

## 1. Project Overview & Architecture

BuscaTuNido API is a modular backend service written in TypeScript using [NestJS](https://nestjs.com/) and [Prisma ORM](https://www.prisma.io/) on top of [PostgreSQL](https://www.postgresql.org/).

### Core Components Structure (Provisional Baseline):

> [!NOTE]
> Specific folder, module, and file hierarchies listed below are initial architectural baselines and will be iteratively finalized as application specifications evolve.

- `src/main.ts`: Application bootstrap, Swagger OpenAPI specification configuration, and global validation pipe binding.
- `src/app.module.ts`: Root module orchestrating configuration and feature modules.
- `src/config/`: Configuration service and environment variable validation.
- `src/prisma/`: `PrismaService` handling database connectivity and lifecycle events.
- `src/common/`: Cross-cutting concerns:
  - `filters/`: Unified exception filters (`HttpExceptionFilter`).
  - `guards/`: Route protection (`JwtAuthGuard`, `RolesGuard`).
  - `interceptors/`: Response transformation and logging interceptors.
- `src/modules/`: Feature modules:
  - `auth/`: Authentication, password hashing, and JWT token issuance.
  - `users/`: Student, landlord, and administrator profiles.
  - `pensions/`: Pension CRUD, search filtering, and distance/geospatial calculations.
  - `reviews/`: Community reviews, ratings, and verification voting.
  - `comparison/`: Multi-pension comparison data aggregation.
  - `reports/`: Community flag reports and moderation pipeline.
- `prisma/schema.prisma`: Database models, indices, and PostgreSQL relations.
- `api/.data/`: Isolated local PostgreSQL cluster (ignored by git via `.gitignore`).
- `tasks/[index]_[task-name].md`: Active task specification being executed.
- `tasks/completed/`: Historical record of finished task specifications.

### Local Database Management (`pnpm db:*`):

The backend relies on an isolated local database cluster stored in `.data/` for zero-configuration reproducibility:

- `pnpm db:init`: Initializes the local PostgreSQL cluster in `.data/` (`initdb -D .data -U postgres -A trust`).
- `pnpm db:start`: Starts the local PostgreSQL daemon in the background (`pg_ctl -D .data start`).
- `pnpm db:stop`: Gracefully shuts down the local PostgreSQL daemon (`pg_ctl -D .data stop`).
- `pnpm db:status`: Inspects if PostgreSQL is responding to connections (`pg_isready -h localhost -U postgres`).
- `pnpm db:seed`: Populates initial sample data via Prisma (`prisma db seed`).

---

## 2. Critical Domain Rules & Patterns

1. **No Code Comments**:
   - Comments inside code are strictly prohibited unless explicitly requested by the user. Write descriptive symbol names and explicit types instead.
1. **No Direct Config File Edits for Dependencies**:
   - Never modify `package.json` or lockfiles manually to install or update dependencies. Use terminal CLI commands (`pnpm add <pkg>`, `pnpm add -D <pkg>`).
1. **DTO & Payload Validation**:
   - Every incoming request must use a DTO decorated with `class-validator` and `class-transformer` rules.
   - All controller endpoints and DTO properties must have OpenAPI `@ApiProperty` / `@ApiOperation` decorators for Swagger generation.
1. **Strict Typing (Types over Interfaces)**:
   - Use TypeScript `type` aliases exclusively; `interface` declarations are strictly forbidden.
   - Explicit return types are required on all controller methods, service methods, and helpers. `any` is strictly prohibited (prefer `unknown` or generics).
1. **Conventional Commits (Concise, Single-Line Only)**:
   - All git commit messages must strictly follow the Conventional Commits specification (e.g., `feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
   - Commit messages must be concise, single-line only, and omit any extended body description.
1. **Brand Naming Convention**:
   - The brand name must always be formatted as a single PascalCase token: `BuscaTuNido` (never separated as `Busca Tu Nido`).

---

## 3. Task-Driven Lifecycle (`tasks/[index]_[task-name].md` Workflow)

Every backend feature, fix, or refactor must strictly adhere to the following workflow:

### Code Quality & Biome Scripts Workflow:

The project utilizes [Biome](https://biomejs.dev/) as a unified, ultra-fast toolchain for formatting and linting. Agents must leverage these dedicated scripts throughout the development workflow:

- `pnpm run format`: Formats source files and enforces styling rules (`biome format --write .`).
- `pnpm run lint`: Scans for code issues and applies safe linter autofixes (`biome lint --write .`).
- `pnpm run check`: Unified command combining formatting, import organization, and safe lint autofixes (`biome check --write .`). Agents must run this after modifying code.
- `pnpm run review`: Read-only verification check (`biome check .`) that returns an error exit code if any unresolved formatting or lint errors exist. Mandatory for validation.

### Execution Cycle:

1. **Task Breakdown by Purpose**:
   - Read the user request(s) and create a separate `tasks/[index]_[task-name].md` file for each request that serves a distinct purpose.
   - *Example*: Adding a new field to a database model and updating its corresponding DTO/service belong in the same task specification. In contrast, configuring CORS or a global module belongs in a separate task specification.
2. **Review & Clarification Gate**:
   - Once all task files are generated, notify the user to review all task specifications in `tasks/`.
   - Ask clarifying questions if any requirement or detail is ambiguous, and STOP the process so the user can review and approve the tasks.
3. **Sequential Execution**:
   - Once the user approves the tasks, execute them one by one until all are completed.
   - For each task, strictly follow these steps:
     - **Read Scope**: Inspect `tasks/[index]_[task-name].md` before modifying code. Confine all implementation strictly to the active task checklist.
     - **Track Progress**: Implement checklist items step-by-step, checking off boxes (`- [x]`) as each phase is completed.
     - **Verify**:
       1. Run `pnpm run check` to automatically organize imports, fix linter warnings, and format code.
       2. Run `pnpm run review` to strictly verify that zero linting or formatting diagnostics remain.
       3. Run application build and test checks (`pnpm run build:local` for fast local development compilation or `pnpm build`). All checks must pass with zero errors before completion.
     - **User Verification**: Present the completed checklist and verification results to the user for review and explicit approval before archiving.
     - **Archive as Documentation**: Upon user approval, move/rename the completed `tasks/[index]_[task-name].md` into `tasks/completed/[index]_[task-name].md` (e.g., `tasks/completed/001_initialize-nestjs-api.md`). This preserves a lightweight, immutable audit trail of backend development.
     - **Handoff**: Proceed to the next pending task in the sequence.

### Standard `[index]_[task-name].md` Template:

```markdown
# Task: [Index] - [Descriptive Title]

## Objective

[1-2 sentences describing backend goal and boundary]

## Checklist

- [ ] [Step 1]
- [ ] [Step 2]

## Target Files

- `src/modules/...`

## Verification

- Code Quality (Biome): `pnpm run check && pnpm run review`
- Build & Tests: `pnpm run build:local` (or `pnpm build`)
```

<!-- BEGIN:nestjs-agent-rules -->

---

## 4. NestJS & Prisma Architectural Guidelines

### Core Framework Conventions:

1. **Dependency Injection & Providers**:
   - Always inject services and repositories via constructor parameter properties: `constructor(private readonly prisma: PrismaService) {}`.
   - Providers must always be decorated with `@Injectable()`.
   - Never instantiate services manually with `new Service()`; rely on the NestJS Inversion of Control (IoC) container.

2. **Modular Encapsulation**:
   - Every domain entity must reside in its own feature module under `src/modules/<feature>/` (e.g., `auth`, `pensions`, `reviews`, `users`).
   - Modules must explicitly declare `controllers`, `providers`, and `exports`. If another module requires a service, export that service from its module and import the owning module in the consuming module's `imports` array.
   - Keep module imports circular-dependency free. Use `forwardRef()` only as a last resort when bidirectional relationships are unavoidable.

3. **Request Lifecycle & Layering**:
   - **Controllers**: Strictly handle HTTP routing, request binding, validation pipe triggers, Swagger metadata, and delegation to services. Never place business logic, complex data transformations, or direct Prisma database calls inside controllers.
   - **Services**: Encapsulate all business logic, authorization verification, data mutation, and orchestration.
   - **DTOs (Data Transfer Objects)**:
     - Mandatory for every request payload (`@Body()`), query parameter set (`@Query()`), and route parameter (`@Param()`).
     - Every DTO property must have both runtime validation decorators (`class-validator`) and OpenAPI documentation decorators (`@ApiProperty()`, `@ApiPropertyOptional()`).
     - Use `@Type(() => Number)` or `@Transform()` for incoming query string and route parameter coercion.

4. **Database Access with Prisma ORM**:
   - Always inject and utilize `PrismaService` (`src/prisma/prisma.service.ts`) for database queries.
   - Multi-step relational operations must be wrapped in atomic transactions using `this.prisma.$transaction(async (tx) => { ... })`.
   - Handle Prisma runtime exceptions gracefully:
     - `P2002` (Unique constraint violation) -> Throw `ConflictException` with a user-friendly message.
     - `P2025` (Record not found) -> Throw `NotFoundException`.

5. **Authentication, Authorization & Guards**:
   - Route protection must be applied declaratively with `@UseGuards(JwtAuthGuard)`.
   - Role-based access control must use the `@Roles(...)` metadata decorator combined with `@UseGuards(JwtAuthGuard, RolesGuard)`.
   - Extract the authenticated user safely using the custom `@CurrentUser()` parameter decorator rather than accessing `req.user` directly.

6. **Error Handling & HTTP Statuses**:
   - Never return raw database error objects or stack traces to the client.
   - Throw semantic NestJS HTTP exceptions: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ConflictException`, or `InternalServerErrorException`.

7. **Testing Standards**:
   - Unit tests use [Vitest](https://vitest.dev/) with `@nestjs/testing` (`Test.createTestingModule`).
   - Mock external dependencies and `PrismaService` when testing domain services in isolation.

<!-- END:nestjs-agent-rules -->
