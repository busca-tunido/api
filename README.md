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

Crear un archivo `.env` en la raíz de `api` (o copiar desde `.env.example`):

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/buscatunido?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="7d"
CORS_ORIGIN="https://web-theta-three-8zz8it8ws2.vercel.app"
```

### Flujo de Ejecución Local

1. **Instalar dependencias**:
   ```bash
   pnpm install
   ```

2. **Configurar e iniciar la base de datos local** (cluster aislado en `.data/`):
   ```bash
   # Solo la primera vez (inicializa el cluster en .data/)
   pnpm run db:init

   # Iniciar el servicio de PostgreSQL en segundo plano
   pnpm run db:start

   # Verificar que el servidor de base de datos esté listo
   pnpm run db:status
   ```

3. **Sincronizar el esquema**:
   ```bash
   # Sincronizar modelos de Prisma con la base de datos local
   pnpm prisma db push

   # Poblar datos de prueba (opcional)
   pnpm run db:seed
   ```

4. **Iniciar el servidor en modo desarrollo**:
   ```bash
   pnpm start:dev
   ```
   La API estará disponible en `http://localhost:4000` y Swagger en `http://localhost:4000/api/docs`.

5. **Detener la base de datos local** (al terminar el trabajo):
   ```bash
   pnpm run db:stop
   ```

### Otros Comandos

```bash
# Compilación rápida para desarrollo local
pnpm run build:local

# Compilación completa con generación de cliente Prisma (producción / CI)
pnpm run build

# Ejecutar pruebas unitarias
pnpm test

# Auto-formato y corrección de linter (Biome)
pnpm run check

# Verificación de calidad de código en modo solo lectura (Biome)
pnpm run review
```
