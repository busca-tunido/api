# BuscaTuNido API

Backend REST service for BuscaTuNido, built with NestJS, Prisma ORM, and PostgreSQL.

## Features

- **Authentication & Roles**: JWT auth with student email domain validation and role-based guards (STUDENT, OWNER, ADMIN, MODERATOR).
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
- PostgreSQL running locally or via Docker

### Environment Configuration

Create a `.env` file in the `api` root:

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/buscatunido?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"
CORS_ORIGIN="http://localhost:3000"
```

### Commands

```bash
# Install dependencies
pnpm install

# Run migrations / push schema
pnpm prisma db push

# Seed sample data
pnpm prisma db seed

# Start development server
pnpm start:dev

# Run tests
pnpm test

# Lint and format
pnpm run check
```
