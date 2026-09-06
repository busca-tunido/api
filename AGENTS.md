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
- `tasks/TODO.md`: Active task specification being executed.
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
2. **No Direct Config File Edits for Dependencies**:
   - Never modify `package.json` or lockfiles manually to install or update dependencies. Use terminal CLI commands (`pnpm add <pkg>`, `pnpm add -D <pkg>`).
3. **DTO & Payload Validation**:
   - Every incoming request must use a DTO decorated with `class-validator` and `class-transformer` rules.
   - All controller endpoints and DTO properties must have OpenAPI `@ApiProperty` / `@ApiOperation` decorators for Swagger generation.
4. **Strict Typing (Types over Interfaces)**:
   - Use TypeScript `type` aliases exclusively; `interface` declarations are strictly forbidden.
   - Explicit return types are required on all controller methods, service methods, and helpers. `any` is strictly prohibited (prefer `unknown` or generics).
5. **Conventional Commits (Concise, Single-Line Only)**:
   - All git commit messages must strictly follow the Conventional Commits specification (e.g., `feat`, `fix`, `chore`, `refactor`, `test`, `docs`).
   - Commit messages must be concise, single-line only, and omit any extended body description.
6. **Brand Naming Convention**:
   - The brand name must always be formatted as a single PascalCase token: `BuscaTuNido` (never separated as `Busca Tu Nido`).

---

## 3. Task-Driven Lifecycle (TODO Workflow)

Every backend feature, fix, or refactor must strictly follow the repository-specific task file generated inside the `tasks/` directory (`tasks/TODO.md`).

### Execution Cycle:

1. **Read Scope**: Inspect `tasks/TODO.md` before altering code. Confine all work exclusively to the items in the checklist.
2. **Track Progress**: Implement checklist items sequentially, checking off boxes (`- [x]`) as each phase is completed.
3. **Verify**: Execute verification commands declared in the task (e.g., `pnpm build`). All checks must pass with zero errors before considering the task complete.
4. **User Verification**: Present the completed checklist and verification results to the user for review and explicit approval before archiving.
5. **Archive as Documentation**: Upon user approval, move/rename the completed `tasks/TODO.md` into `tasks/completed/[index]-[task-name].md` (e.g., `tasks/completed/001-initialize-nestjs-api.md`). This preserves a lightweight, immutable audit trail of backend development.
6. **Handoff**: Generate a new, clean `tasks/TODO.md` inside `tasks/` for the next planned task.

### Standard `TODO.md` Template:

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

- Command: `[e.g., pnpm build]`
```
