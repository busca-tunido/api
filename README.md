# BuscaTuNido API

Backend REST service for BuscaTuNido, built with NestJS, Prisma ORM, and MongoDB Atlas.

## Public Deployments & Links

- **API (Production)**: [https://buscatunido-api.onrender.com](https://buscatunido-api.onrender.com)
- **Swagger / OpenAPI Documentation**: [https://buscatunido-api.onrender.com/api/docs](https://buscatunido-api.onrender.com/api/docs)
- **Official Web App (Frontend)**: [https://buscatunido.vercel.app/](https://buscatunido.vercel.app/)

## Features

- **Authentication & Roles**: JWT auth with student email domain validation and role-based guards (STUDENT, LANDLORD, ADMIN, MODERATOR).
- **Listings & Amenities**: Comprehensive pension, room, amenity, and rule management.
- **Reviews & Bookings**: Verification-backed student reviews, ratings, and application tracking.
- **OpenAPI / Swagger**: Auto-generated interactive API docs at `/api/docs`.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **ORM & Database**: [Prisma ORM](https://www.prisma.io/) on [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database)
- **Linter & Formatter**: [Biome](https://biomejs.dev/)

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- MongoDB Atlas connection string (or cluster access)

### Environment Configuration

Copy `.env.example` to `.env` and set your local environment variables:

```bash
cp .env.example .env
```

### Local Execution Workflow

```bash
# 1. Install dependencies
pnpm install

# 2. Seed database with amenities, universities, and listings
pnpm run db:seed

# 3. Start NestJS development server (http://localhost:4000 and Swagger docs at /api/docs)
pnpm start:dev
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
- `DATABASE_URL`: MongoDB Atlas connection string (with SSL & replica set).
- `JWT_SECRET`: Secret key for signing and verifying JWT tokens.
- `JWT_EXPIRATION`: Session token duration (e.g., `7d`).
- `CORS_ORIGIN`: `https://buscatunido.vercel.app` (enables cross-origin communication with the official Vercel web frontend).
