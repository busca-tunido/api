# syntax=docker/dockerfile:1

# =============================================================================
# Stage 1: Base build environment (Node 24 LTS Debian Slim + pinned pnpm)
# - Debian slim (glibc) is used instead of Alpine (musl) for prebuilt `sharp`
#   (libvips) binaries and Prisma 6 MongoDB OpenSSL 3.0 engine compatibility.
# - pnpm is pinned explicitly instead of relying on Corepack (removed in Node 25+).
# =============================================================================
FROM node:24-slim AS base

ARG PNPM_VERSION=12.21.0

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI="true"

# Install openssl + ca-certificates so `prisma generate` detects `debian-openssl-3.0.x`
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g "pnpm@${PNPM_VERSION}"

WORKDIR /app

# =============================================================================
# Stage 2: Production-only dependencies (cached independently from source code)
# - `--ignore-scripts` skips `@prisma/client` postinstall stub so the generated
#   client copied from `builder` into `/app/node_modules/.prisma` is authoritative.
# - Keeps optional platform packages (`@img/sharp-linux-*`) for `sharp`.
# =============================================================================
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts \
    && rm -rf /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma

# =============================================================================
# Stage 3: Full build (Prisma Client generation + NestJS SWC compilation)
# =============================================================================
FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma Client + extract `.prisma` directory out of pnpm virtual store
RUN DATABASE_URL="mongodb://localhost:27017/buscatunido" \
    SQL_DATABASE_URL="postgresql://localhost:5432/buscatunido" \
    pnpm exec prisma generate --schema=prisma/schema.prisma \
    && SQL_DATABASE_URL="postgresql://localhost:5432/buscatunido" \
    pnpm exec prisma generate --schema=prisma/schema.sql.prisma \
    && PRISMA_GEN_DIR="$(find /app/node_modules -type d -name '.prisma' | head -n 1)" \
    && test -n "$PRISMA_GEN_DIR" \
    && cp -R "$PRISMA_GEN_DIR" /app/generated-prisma \
    && cp -R /app/node_modules/@prisma/sql-client /app/generated-sql-client

COPY tsconfig.json tsconfig.build.json nest-cli.json .swcrc ./
COPY src ./src

RUN pnpm exec nest build

# =============================================================================
# Stage 4: Minimal hardened production runtime (Google Cloud Run / Docker)
# =============================================================================
FROM node:24-slim AS runner

WORKDIR /app

ENV NODE_ENV="production"
ENV PORT="8080"
# Prevent glibc malloc arena fragmentation under multithreaded sharp/libvips
ENV MALLOC_ARENA_MAX="2"
# Accurate TypeScript stack traces in Cloud Logging via SWC source maps
ENV NODE_OPTIONS="--enable-source-maps"

# Minimal runtime libs required by Prisma 6 query engine & MongoDB Atlas TLS
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/generated-prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/generated-sql-client ./node_modules/@prisma/sql-client
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 8080

# Zero-dependency health check for Docker / Compose / VPS (Cloud Run uses its own HTTP probe)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 8080) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

# Exec form launches Node directly as PID 1 so SIGTERM triggers NestJS graceful shutdown
CMD ["node", "dist/main.js"]
