# Task: S3 Storage Bucket Environment Partitioning (Neon Storage)

## Execution Profile

- **Wave / Batch**: Wave 2 (Storage Architecture)
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (Storage & Uploads)`
- **Dependencies (`depends_on`)**: None
- **Collision Risk**: `LOW (Isolated upload service files)`

## Target Files

- **Exclusive**:
  - `src/uploads/uploads.service.ts`
  - `src/uploads/uploads.service.spec.ts`
  - `src/uploads/dto/upload-image-response.dto.ts`
- **Shared / Integration Points**:
  - None

## Objective

Restructure file uploads in the Neon S3 bucket into environment-specific folders (`dev/`, `prod/`, and `test/`), preventing test runs or local development uploads from polluting or conflicting with production media assets.

## Technical Specifications

### 1. Folder Prefix Resolution
In `src/uploads/uploads.service.ts`:
- Determine the environment prefix dynamically:
  ```ts
  const folderPrefix = env.NODE_ENV === 'production' ? 'prod' : env.NODE_ENV === 'test' ? 'test' : 'dev';
  ```
- Structure uploaded object keys as:
  - Primary: `${folderPrefix}/pensions/${fileId}.webp`
  - Thumbnail: `${folderPrefix}/pensions/${fileId}-thumb.webp`
- The resulting public URL must reflect the structured key:
  ```ts
  const url = `${this.publicBaseUrl}/${folderPrefix}/pensions/${primaryFilename}`;
  const thumbnailUrl = `${this.publicBaseUrl}/${folderPrefix}/pensions/${thumbnailFilename}`;
  ```

### 2. Local Fallback Directory Structure
When local storage fallback is used (non-S3 mode):
- Ensure `uploads/${folderPrefix}/pensions/` directory is created recursively with `fs.mkdir(..., { recursive: true })`.

## Step-by-Step Implementation Plan

1. Update `UploadsService` constructor and `processImage` method to construct path keys containing the environment folder prefix.
2. Ensure local directory creation respects the nested directory path.
3. Update unit tests in `src/uploads/uploads.service.spec.ts` to assert that uploaded keys and returned URLs contain the expected `dev/pensions/` or `test/pensions/` prefixes.

## Verification & Quality Gate

- `pnpm vitest run src/uploads/uploads.service.spec.ts` passes with 100% assertions satisfied.
- `pnpm run check` passes.
