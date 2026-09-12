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
- `tasks/[task-name].md`: Active task specification being executed.
- `tasks/completed/[index]_[task-name].md`: Historical record of finished task specifications with chronological index.

### Local Database Management (`pnpm db:*`):

The backend relies on an isolated local database cluster stored in `.data/` for zero-configuration reproducibility:

- `pnpm db:init`: Initializes the local PostgreSQL cluster in `.data/` (`initdb -D .data -U postgres -A trust`).
- `pnpm db:start`: Starts the local PostgreSQL daemon in the background (`pg_ctl -D .data start`).
- `pnpm db:stop`: Gracefully shuts down the local PostgreSQL daemon (`pg_ctl -D .data stop`).
- `pnpm db:status`: Inspects if PostgreSQL is responding to connections (`pg_isready -h localhost -U postgres`).
- `pnpm db:seed`: Populates initial sample data via Prisma (`prisma db seed`).
- `pnpm run build:local`: Sets up and compiles the full local development stack for a new or existing machine (`pnpm db:start && prisma db push && pnpm db:seed && nest build`).

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
1. **Strictly for Registered & Authenticated Users (No Guests Allowed)**:
   - The platform does not permit unauthenticated/guest interactions or guest contributions.
   - All community actions (publishing reviews, submitting edit proposals, saving favorites, filing reports, uploading photos) strictly require authenticated session JWT tokens (`JwtAuthGuard`).
   - Anonymous or guest modes are completely prohibited by design.
1. **Brand Naming Convention**:
   - The brand name must always be formatted as a single PascalCase token: `BuscaTuNido` (never separated as `Busca Tu Nido`).

---

## 3. Task-Driven Lifecycle (`tasks/[task-name].md` Workflow)

Every backend feature, fix, or refactor must strictly adhere to the following workflow:

### Code Quality & Biome Scripts Workflow:

- `pnpm run check`: Unified command combining formatting, import organization, and safe lint autofixes (`biome check --write .`). Agents must run this after modifying code.
- `pnpm run review`: Read-only verification check (`biome check .`) that returns an error exit code if any unresolved formatting or lint errors exist. Mandatory for validation.

> [!IMPORTANT]
> **Always Use Global `pnpm run <script>` (Do Not Target Individual Files)**:
> Due to Biome's extreme execution speed (processing the entire project in tens of milliseconds), agents must always execute the predefined global scripts (`pnpm run check`, `pnpm run review`, `pnpm run format`, `pnpm run lint`) targeting the whole repository (`.`) rather than targeting individual files. Running against specific files provides no measurable performance advantage and risks leaving formatting or lint inconsistencies across the project.

### Execution Cycle:

1. **Task Breakdown by Purpose & Topology**:
   - Read the user request(s) and decompose them into structured `tasks/[task-name].md` files (omitting any index prefix while active in `tasks/`).
   - Act as a **Directed Acyclic Graph (DAG) compiler**, assigning each task an explicit `Execution Profile` (Wave, Mode, Role, Dependencies, Collision Risk).
2. **Review & Clarification Gate**:
   - Once all task specifications are generated, notify the user to review the DAG and execution waves in `tasks/`.
   - Ask clarifying questions if any requirement or boundary is ambiguous, and STOP so the user can review and approve the plan.
3. **Parallel Decomposition & Dependency Rules for the Planner Agent**:
   When breaking down user requirements into task specifications, the planner agent must evaluate concurrency using the **Disjoint File Sets Rule**:
   - **Orthogonality Check (Collision Matrix)**:
     - Compare `Target Files` between all proposed tasks.
     - **Parallelizable (Disjoint)**: If $Files(Task\_A) \cap Files(Task\_B) = \emptyset$, both tasks must be assigned to the same `Wave` with `Execution Mode: PARALLEL`.
     - **Sequential (Intersection)**: If two tasks modify the same domain file or internal logic, the dependent task must be assigned to `Wave N+1` with `Execution Mode: SEQUENTIAL` and list its prerequisite in `depends_on`.
   - **Handling Critical Shared Hubs (`prisma/schema.prisma`, `src/app.module.ts`, lockfiles)**:
     - Global database schemas and root modules are high-risk collision points.
     - **Contract-First / Wave 0 Rule**: If multiple tasks require schema changes, the planner must create a **Preparatory Task (Wave 0)** to apply Prisma schema modifications, execute migrations/pushes, and generate client types before launching parallel service tasks.
     - Workers must NOT edit `src/app.module.ts` during parallel worker tasks; module registration is deferred to the `Integrator Agent` in the Wave Sync Gate.
   - **Wave Structure (DAG Execution)**:
     - Organize work into chronological waves:
       - `Wave 0 (Setup / Contracts)`: Prisma schemas, seeders, shared DTOs, global configuration (Sequential).
       - `Wave 1 (Workers)`: Feature modules, services, controllers in parallel branches/worktrees (Isolated).
       - `Wave 1 - Sync Gate`: Merge, resolve `src/app.module.ts` registration, run integrated compilation checks (Sequential).

4. **Agent Role Assignment: Worker Agent vs. Integrator Agent**:

| Rol de Agente                      | Ámbito de Trabajo                                                      | Reglas de Asignación                                                                                                                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Worker Agent (N instancias)**    | Ramas/Worktrees independientes (`worktree-task-A`, `worktree-task-B`). | Se le asigna **1 sola tarea paralela**. Solo puede editar sus `Exclusive Target Files`. Verifica localmente (`pnpm run check && pnpm run review` y `pnpm run build:local`). Al terminar, realiza su commit convencional y se detiene.              |
| **Integrator Agent (1 instancia)** | Rama base de integración (`main` o `staging`).                         | Se asigna a tareas con etiqueta `Assigned Role: Integrator Agent`. No programa lógica de negocio nueva. Realiza merges/rebases, modifica archivos compartidos (`Shared / Integration Points`) como `app.module.ts` y valida la compilación global. |

5. **Wave Sync Gate (`task-sync-wave-N.md`)**:
   For every batch, the planner agent must automatically include a closing integration task named `task-sync-wave-N.md`. This task:
   - Unlocks strictly when all checklists for tasks in `Wave N` are marked completed (`- [x]`).
   - Is formally assigned to the **Integrator Agent**.
   - Follows the integration checklist:
     1. Merge or rebase worker branches/worktrees into the base branch.
     2. Update shared integration hubs (e.g., register new feature modules in `src/app.module.ts`).
     3. Run global repository verification (`pnpm run check && pnpm run review` and `pnpm run build:local` / `pnpm build`).
     4. Resolve any interoperability or type conflicts as the sole authorized agent.
     5. Teardown temporary worktrees (`git worktree remove`).

6. **Archive as Documentation**:
   - Upon user approval and successful Wave integration, move/rename completed `tasks/[task-name].md` into `tasks/completed/[index]_[task-name].md` (e.g., `tasks/completed/001_initialize-nestjs-api.md`), assigning its chronological three-digit index only upon completion to preserve an immutable audit trail.

### Standard `[task-name].md` Template:

```markdown
# Task: [Descriptive Title]

## Execution Profile

- **Wave / Batch**: Wave 1 | Wave 2 | Wave 3
- **Execution Mode**: `PARALLEL` | `SEQUENTIAL`
- **Assigned Role**: `Worker Agent` | `Integrator Agent`
- **Dependencies (`depends_on`)**: None | `[task-name-a.md, task-name-b.md]`
- **Collision Risk**: `LOW (Isolated files)` | `HIGH (Shared core files)`

## Target Files

- **Exclusive**:
  - `src/modules/uploads/uploads.service.ts`
  - `src/modules/uploads/uploads.controller.ts`
- **Shared / Integration Points**:
  - `src/app.module.ts` (Requiere Merge Gate)
  - `prisma/schema.prisma` (Bloqueante si hay cambios DDL concurrentes)

## Objective

[1-2 sentences describing backend goal and boundary]

## Technical Specifications

[Key technical details, DTO schemas, endpoints, business rules]

## Checklist

- [ ] [Step 1]
- [ ] [Step 2]

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
