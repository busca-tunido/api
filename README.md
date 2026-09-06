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

2. **Inicializar cluster de base de datos local** (solo la primera vez en una máquina nueva):
   ```bash
   pnpm run db:init
   ```

3. **Puesta en marcha y compilación local (Recomendado)**:
   Ejecuta en una sola orden el arranque de PostgreSQL, la sincronización de Prisma, la carga de datos de prueba (`seed`) y la compilación de NestJS:
   ```bash
   pnpm run build:local
   ```

   *(Alternativa: Control granular de cada servicio)*:
   ```bash
   # Iniciar el servicio de PostgreSQL en segundo plano
   pnpm run db:start

   # Verificar que el servidor de base de datos esté listo
   pnpm run db:status

   # Sincronizar modelos de Prisma con la base de datos local
   pnpm prisma db push

   # Poblar datos de prueba iniciales
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

### Otros Comandos Útiles

```bash
# Setup y compilación completa para desarrollo local (db:start + prisma db push + db:seed + nest build)
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

---

## Despliegue en Servidor (Producción)

Actualmente la API se encuentra desplegada y automatizada en la nube a través de [Render](https://render.com/):

- **Servicio**: Web Service en Render
- **URL Pública**: [https://buscatunido-api.onrender.com](https://buscatunido-api.onrender.com)
- **Documentación OpenAPI**: [https://buscatunido-api.onrender.com/api/docs](https://buscatunido-api.onrender.com/api/docs)
- **Repositorio conectado**: `busca-tunido/api` (rama `main`)
- **Auto-deploy**: Despliegue continuo automático ante cada push a la rama `main`.

### Pipeline de Despliegue en Render

1. **Build Command**:
   ```bash
   pnpm install && pnpm run build
   ```
   - El comando `pnpm run build` ejecuta `prisma generate && nest build`, asegurando que el cliente de Prisma se compile contra el esquema de base de datos antes de generar el bundle de NestJS en la carpeta `dist/`.
2. **Start Command**:
   ```bash
   pnpm run start:prod
   ```
   - Inicia el servidor de producción ejecutando `node dist/main`.
3. **Variables de Entorno Configuradas en Render**:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Conexión a la base de datos PostgreSQL en la nube (con SSL).
   - `JWT_SECRET`: Clave criptográfica para la firma y validación de tokens JWT.
   - `JWT_EXPIRATION`: Duración de validez de sesiones (ej. `7d`).
   - `CORS_ORIGIN`: `https://web-theta-three-8zz8it8ws2.vercel.app` (permite comunicación CORS desde el frontend oficial desplegado en Vercel).
