# Task: HTTP Caching Headers and Compression (`api/tasks/021_http-caching-headers.md`)

## Execution Profile

- **Wave / Batch**: Wave 1
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (API Performance)`
- **Dependencies (`depends_on`)**: `[]`
- **Collision Risk**: `LOW (Isolated interceptors and metadata controllers)`

## Target Files

- **Exclusive**:
  - `src/common/interceptors/cache-control.interceptor.ts`
  - `src/universities/universities.controller.ts`

## Objective

Add HTTP `Cache-Control` response headers (`public, max-age=3600, stale-while-revalidate=86400`) and ETag support for public, semi-static metadata endpoints (like `/universities`) in NestJS to minimize database queries and allow browsers and edge CDNs to serve requests with 0ms latency.

## Technical Specifications

1. **`src/common/interceptors/cache-control.interceptor.ts`**:
   - Create a NestJS interceptor `@Injectable() export class CacheControlInterceptor implements NestInterceptor`.
   - Read custom decorator metadata or accept `(maxAgeSeconds: number, staleWhileRevalidateSeconds?: number)`.
   - Set Fastify response header `Cache-Control: public, max-age=${maxAge}, stale-while-revalidate=${stale}`.

2. **`src/universities/universities.controller.ts`**:
   - Apply `CacheControlInterceptor` or `@Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')` to `GET /universities` and `GET /universities/:id`.

## Checklist

- [ ] Implement `CacheControlInterceptor` in `src/common/interceptors/cache-control.interceptor.ts`.
- [ ] Apply caching headers to `UniversitiesController` read methods.
- [ ] Strict typing with standard TypeScript notations (no `any`).
- [ ] Stage exclusively target files and commit with `perf(api): add http cache-control headers for static endpoints`.
