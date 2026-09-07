# BuscaTuNido API

Backend REST service for BuscaTuNido, built with NestJS, Prisma ORM, and PostgreSQL.

## Public Deployments & Links

- **API (Production)**: [https://buscatunido-api.onrender.com](https://buscatunido-api.onrender.com)
- **Swagger / OpenAPI Documentation**: [https://buscatunido-api.onrender.com/api/docs](https://buscatunido-api.onrender.com/api/docs)
- **Official Web App (Frontend)**: [https://web-git-main-joseleivas-projects.vercel.app/](https://web-git-main-joseleivas-projects.vercel.app/)

## Features

- **Authentication & Roles**: JWT auth with student email domain validation and role-based guards (STUDENT, LANDLORD, ADMIN, MODERATOR).
- **Listings & Amenities**: Comprehensive pension, room, amenity, and rule management.
- **Reviews & Bookings**: Verification-backed student reviews, ratings, and application tracking.
- **OpenAPI / Swagger**: Auto-generated interactive API docs at `/api/docs`.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **ORM & Database**: [Prisma ORM](https://www.prisma.io/) on [PostgreSQL](https://www.postgresql.org/)
- **Linter & Formatter**: [Biome](https://biomejs.dev/)

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL CLI tools (`initdb`, `pg_ctl`, `pg_isready` in PATH or installed via Scoop/Homebrew)

### Environment Configuration

Copy `.env.example` to `.env` and set your local environment variables:

```bash
cp .env.example .env
```

### Local Execution Workflow

```bash
# 1. Install dependencies
pnpm install

# 2. Initialize local database cluster (first time only)
pnpm run db:init

# 3. Start local stack and build (starts DB, pushes Prisma schema, seeds data, and compiles NestJS)
pnpm run build:local

# 4. Start NestJS development server (http://localhost:4000 and Swagger docs at /api/docs)
pnpm start:dev

# 5. Stop local database daemon when finished
pnpm run db:stop
```

---

## Production Deployment (Server)

The API is continuously deployed and automated in the cloud via [Render](https://render.com/):

- **Service**: Render Web Service
- **Public URL**: [https://buscatunido-api.onrender.com](https://buscatunido-api.onrender.com)
- **OpenAPI Documentation**: [https://buscatunido-api.onrender.com/api/docs](https://buscatunido-api.onrender.com/api/docs)
- **Connected Repository**: `busca-tunido/api` (branch: `main`)
- **Auto-deploy**: Triggered automatically on every push to the `main` branch.

### Render Deployment Pipeline

```bash
# Build Command: install dependencies, generate Prisma Client, and compile with nest build
pnpm install && pnpm run build

# Start Command: start production server (node dist/main)
pnpm run start:prod
```

**Render Environment Variables**:
- `NODE_ENV`: `production`
- `DATABASE_URL`: Cloud PostgreSQL connection string (with SSL).
- `JWT_SECRET`: Secret key for signing and verifying JWT tokens.
- `JWT_EXPIRATION`: Session token duration (e.g., `7d`).
- `CORS_ORIGIN`: `https://web-git-main-joseleivas-projects.vercel.app` (enables cross-origin communication with the official Vercel web frontend).
