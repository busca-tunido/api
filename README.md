# BuscaTuNido API

Backend REST service for BuscaTuNido, built with NestJS, Prisma ORM, and PostgreSQL.

## Enlaces Públicos / Deployments

- **API en Producción**: [https://buscatunido-api.onrender.com](https://buscatunido-api.onrender.com)
- **Documentación Swagger / OpenAPI**: [https://buscatunido-api.onrender.com/api/docs](https://buscatunido-api.onrender.com/api/docs)
- **Web Oficial (Frontend)**: [https://web-theta-three-8zz8it8ws2.vercel.app/](https://web-theta-three-8zz8it8ws2.vercel.app/)

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
- PostgreSQL CLI tools (`initdb`, `pg_ctl`, `pg_isready` en el PATH o instalados con Scoop/Homebrew)

### Environment Configuration

Copia el archivo `.env.example` a `.env` y reemplaza los valores.

### Flujo de Ejecución Local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Inicializar cluster de base de datos local (solo la primera vez)
pnpm run db:init

# 3. Puesta en marcha y compilación local (inicia DB, aplica Prisma, corre seed y compila NestJS)
pnpm run build:local

# 4. Iniciar el servidor en modo desarrollo (http://localhost:4000 y docs en /api/docs)
pnpm start:dev

# 5. Detener la base de datos local al terminar
pnpm run db:stop
```

---

## Despliegue en Servidor (Producción)

Actualmente la API se encuentra desplegada y automatizada en la nube a través de [Render](https://render.com/):

- **Servicio**: Web Service en Render
- **URL Pública**: [https://buscatunido-api.onrender.com](https://buscatunido-api.onrender.com)
- **Documentación OpenAPI**: [https://buscatunido-api.onrender.com/api/docs](https://buscatunido-api.onrender.com/api/docs)
- **Repositorio conectado**: `busca-tunido/api` (rama `main`)
- **Auto-deploy**: Despliegue continuo automático ante cada push a la rama `main`.

### Pipeline de Despliegue en Render

```bash
# Build Command: instala dependencias, genera Prisma Client y compila con nest build
pnpm install && pnpm run build

# Start Command: inicia el servidor de producción (node dist/main)
pnpm run start:prod
```

**Variables de Entorno en Render**:
- `NODE_ENV`: `production`
- `DATABASE_URL`: Conexión a la base de datos PostgreSQL en la nube (con SSL).
- `JWT_SECRET`: Clave criptográfica para la firma y validación de tokens JWT.
- `JWT_EXPIRATION`: Duración de validez de sesiones (ej. `7d`).
- `CORS_ORIGIN`: `https://web-theta-three-8zz8it8ws2.vercel.app` (permite comunicación CORS desde el frontend en Vercel).
