# Task: Image Processing Pipeline & WebP Conversion (`api/tasks/image-pipeline-sharp-webp.md`)

## Objective

Build a server-side image processing and upload pipeline using `sharp` and `multer`. Ensure that the API accepts common image formats (JPEG, PNG, HEIC, WebP, AVIF), validates magic bytes, strips personal EXIF metadata (GPS/camera data), converts all images to `.webp` format, and persists only `.webp` references in the database.

---

## Technical Specifications

### 1. Upload Module & Endpoint (`POST /uploads/images`)
- Accept `multipart/form-data` with single or multiple image files.
- Restrict max file size (e.g. 8 MB per file).
- Validate MIME magic bytes to prevent arbitrary binary upload attacks.

### 2. Sharp Image Processing Pipeline
- Process uploaded buffer through `sharp`:
  - `rotate()`: Preserve camera orientation.
  - `strip()` / omit metadata: Remove EXIF tags for student privacy.
  - Generate primary display version: WebP, max width 1600px, quality 82.
  - Generate thumbnail version: WebP, max width 400px, quality 80.
- Save to static uploads directory or Cloudflare R2 / S3 storage.
- Return public WebP URLs: `{ url: string, thumbnailUrl: string, width: number, height: number }`.

### 3. Integration with Pensions & Rooms
- Update `PensionImage` service to attach the converted WebP URLs.
- Ensure database never stores non-WebP URLs.

---

## Checklist

- [ ] Suggest terminal command to install `sharp` and `@types/multer`.
- [ ] Create `src/uploads/uploads.module.ts`, `src/uploads/uploads.service.ts`, and `src/uploads/uploads.controller.ts`.
- [ ] Implement WebP conversion pipeline with metadata stripping and responsive variants in `UploadsService`.
- [ ] Create E2E / integration tests in `src/uploads/uploads.service.spec.ts` testing format conversion and invalid format rejection.
- [ ] Ensure Swagger documentation accurately specifies `multipart/form-data` and returns the WebP response envelope.
- [ ] Validate code quality with Biome (`pnpm run check && pnpm run review`).
- [ ] Verify build with `pnpm exec nest build`.

---

## Target Files

- `src/uploads/uploads.module.ts`
- `src/uploads/uploads.service.ts`
- `src/uploads/uploads.controller.ts`
- `src/uploads/uploads.service.spec.ts`
- `src/app.module.ts`
- `prisma/schema.prisma`
