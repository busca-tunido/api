# Task: Ingest and Synchronize Curated WebP Assets to Neon S3 Storage Bucket

## Execution Profile

- **Wave / Batch**: Wave 2 (Storage & Asset Ingestion)
- **Execution Mode**: `PARALLEL`
- **Assigned Role**: `Worker Agent (Storage & Assets)`
- **Dependencies (`depends_on`)**: None
- **Collision Risk**: `LOW (Self-contained ingestion script and manifest)`

## Target Files

- **Exclusive**:
  - `scripts/sync-curated-assets.ts`
  - `prisma/data/assets-manifest.json`
- **Shared / Integration Points**:
  - `.env`

## Objective

Upload the curated visual catalog of 996+ WebP images (~33 MB) located at `C:\Users\tkdgi\Downloads\imagenes-tunido\imágenes` to the S3 bucket (Neon Object Storage) under the environment-partitioned folder structure (`dev/` and `prod/`), and generate a structured asset manifest (`prisma/data/assets-manifest.json`) for deterministic consumption by the database seed pipeline.

## Technical Specifications

### 1. Source Folder Hierarchy
The local source directory `C:\Users\tkdgi\Downloads\imagenes-tunido\imágenes` contains:
```
imágenes/
├── hogares/
│   ├── alta/          # 56 imágenes exteriores/comunes de alta calidad
│   ├── media/         # 56 imágenes de calidad media
│   └── baja/          # 58 imágenes de calidad baja
├── habitaciones/
│   ├── alta/          # 75 habitaciones amplias / modernas
│   ├── media/         # 75 habitaciones estándar
│   └── baja/          # 76 habitaciones sencillas / económicas
└── perfiles/
    ├── duenos/
    │   ├── hombres/   # 150 avatares masculinos de arrendadores
    │   └── mujeres/   # 150 avatares femeninos de arrendadoras
    └── estudiantes/
        ├── hombres/   # 150 avatares masculinos de estudiantes
        └── mujeres/   # 150 avatares femeninos de estudiantes
```

### 2. Bucket Upload Strategy
In `scripts/sync-curated-assets.ts`:
- Read S3 credentials from `process.env`:
  - `AWS_ENDPOINT_URL_S3`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `PUBLIC_STORAGE_BUCKET` (default `"uploads"`)
- Target Environments: Upload identical assets to both `dev/` and `prod/` prefixes:
  - `dev/hogares/<tier>/<filename>.webp` and `prod/hogares/<tier>/<filename>.webp`
  - `dev/habitaciones/<tier>/<filename>.webp` and `prod/habitaciones/<tier>/<filename>.webp`
  - `dev/perfiles/duenos/<genero>/<filename>.webp` and `prod/perfiles/duenos/<genero>/<filename>.webp`
  - `dev/perfiles/estudiantes/<genero>/<filename>.webp` and `prod/perfiles/estudiantes/<genero>/<filename>.webp`
- Concurrency Control:
  Execute uploads with a pool of 20 concurrent promises using `@aws-sdk/client-s3` (`PutObjectCommand` with `ContentType: 'image/webp'`) to prevent socket exhaustion.
- Idempotency: Skip files that already exist or check existence if needed.

### 3. Generated Assets Manifest (`prisma/data/assets-manifest.json`)
Produce a JSON structure indexing all relative paths:
```json
{
  "hogares": {
    "alta": ["hogares/alta/hogar_0001.webp", "..."],
    "media": ["hogares/media/hogar_0057.webp", "..."],
    "baja": ["hogares/baja/hogar_0113.webp", "..."]
  },
  "habitaciones": {
    "alta": ["habitaciones/alta/habitacion_0001.webp", "..."],
    "media": ["habitaciones/media/habitacion_0076.webp", "..."],
    "baja": ["habitaciones/baja/habitacion_0151.webp", "..."]
  },
  "perfiles": {
    "duenos": {
      "hombres": ["perfiles/duenos/hombres/dueno_h_0001.webp", "..."],
      "mujeres": ["perfiles/duenos/mujeres/dueno_m_0001.webp", "..."]
    },
    "estudiantes": {
      "hombres": ["perfiles/estudiantes/hombres/estudiante_h_0001.webp", "..."],
      "mujeres": ["perfiles/estudiantes/mujeres/estudiante_m_0001.webp", "..."]
    }
  }
}
```

## Step-by-Step Implementation Plan

1. Create `scripts/sync-curated-assets.ts` utilizing `@aws-sdk/client-s3`.
2. Implement recursive scanner that reads all `.webp` files from `C:\Users\tkdgi\Downloads\imagenes-tunido\imágenes`.
3. Dispatch uploads in controlled batches to Neon S3 under `dev/` and `prod/`.
4. Serialize the categorized relative URL index into `prisma/data/assets-manifest.json`.
5. Run the script with `pnpm -C api exec tsx scripts/sync-curated-assets.ts`.

## Verification & Quality Gate

- Ingestion script completes with exit code 0.
- `prisma/data/assets-manifest.json` exists and indexes at least 950 valid WebP asset paths.
- Sample S3 HEAD/GET requests confirm images are publicly accessible via `${PUBLIC_NEON_STORAGE_BASE_URL}/dev/...`.
