import { existsSync, mkdirSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile();
}

interface AssetsManifest {
  hogares: {
    alta: string[];
    media: string[];
    baja: string[];
  };
  habitaciones: {
    alta: string[];
    media: string[];
    baja: string[];
  };
  perfiles: {
    duenos: {
      hombres: string[];
      mujeres: string[];
    };
    estudiantes: {
      hombres: string[];
      mujeres: string[];
    };
  };
}

interface UploadTask {
  localPath: string;
  relativePath: string;
  s3Key: string;
}

const SOURCE_DIR = 'C:\\Users\\tkdgi\\Downloads\\imagenes-tunido\\imágenes';
const ENDPOINT =
  process.env.AWS_ENDPOINT_URL_S3 ||
  'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech';
const REGION = process.env.AWS_REGION || 'us-east-2';
const BUCKET = process.env.PUBLIC_STORAGE_BUCKET || 'uploads';
const ACCESS_KEY_ID =
  process.env.AWS_ACCESS_KEY_ID || 'nak_live_5119d554e20e489985285a1b82735d4a';
const SECRET_ACCESS_KEY =
  process.env.AWS_SECRET_ACCESS_KEY ||
  'nsk_live_54448ce989196e9fe59fba014565858d1157f0dfbab8d88bb56366550ca72350';

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const scanCategoryFiles = async (
  subDir: string,
): Promise<{ relativePaths: string[]; fullPaths: string[] }> => {
  const dirPath = path.join(SOURCE_DIR, subDir);
  if (!existsSync(dirPath)) {
    return { relativePaths: [], fullPaths: [] };
  }
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const webpFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.webp'))
    .map((entry) => entry.name)
    .sort();

  return {
    relativePaths: webpFiles.map((file) =>
      path.posix.join(...subDir.split(path.sep), file),
    ),
    fullPaths: webpFiles.map((file) => path.join(dirPath, file)),
  };
};

const fileExistsInS3 = async (key: string): Promise<boolean> => {
  try {
    const head = await s3.send(
      new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    return typeof head.ContentLength === 'number' && head.ContentLength > 0;
  } catch {
    return false;
  }
};

const uploadFileWithRetry = async (task: UploadTask): Promise<void> => {
  const exists = await fileExistsInS3(task.s3Key);
  if (exists) {
    return;
  }

  const fileBuffer = await fs.readFile(task.localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: task.s3Key,
      Body: fileBuffer,
      ContentType: 'image/webp',
    }),
  );
};

const executePool = async <T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>,
): Promise<void> => {
  let index = 0;
  const executing = new Set<Promise<void>>();

  while (index < items.length) {
    while (executing.size < limit && index < items.length) {
      const item = items[index];
      index++;
      const promise = (async () => {
        try {
          await handler(item);
        } finally {
          executing.delete(promise);
        }
      })();
      executing.add(promise);
    }
    if (executing.size > 0) {
      await Promise.race(executing);
    }
  }
  await Promise.all(executing);
};

const run = async (): Promise<void> => {
  console.log(`Starting assets sync from: ${SOURCE_DIR}`);
  console.log(`Target Bucket: ${BUCKET} on ${ENDPOINT}`);

  const [
    hogaresAlta,
    hogaresMedia,
    hogaresBaja,
    habitacionesAlta,
    habitacionesMedia,
    habitacionesBaja,
    duenosHombres,
    duenosMujeres,
    estudiantesHombres,
    estudiantesMujeres,
  ] = await Promise.all([
    scanCategoryFiles(path.join('hogares', 'alta')),
    scanCategoryFiles(path.join('hogares', 'media')),
    scanCategoryFiles(path.join('hogares', 'baja')),
    scanCategoryFiles(path.join('habitaciones', 'alta')),
    scanCategoryFiles(path.join('habitaciones', 'media')),
    scanCategoryFiles(path.join('habitaciones', 'baja')),
    scanCategoryFiles(path.join('perfiles', 'duenos', 'hombres')),
    scanCategoryFiles(path.join('perfiles', 'duenos', 'mujeres')),
    scanCategoryFiles(path.join('perfiles', 'estudiantes', 'hombres')),
    scanCategoryFiles(path.join('perfiles', 'estudiantes', 'mujeres')),
  ]);

  const manifest: AssetsManifest = {
    hogares: {
      alta: hogaresAlta.relativePaths,
      media: hogaresMedia.relativePaths,
      baja: hogaresBaja.relativePaths,
    },
    habitaciones: {
      alta: habitacionesAlta.relativePaths,
      media: habitacionesMedia.relativePaths,
      baja: habitacionesBaja.relativePaths,
    },
    perfiles: {
      duenos: {
        hombres: duenosHombres.relativePaths,
        mujeres: duenosMujeres.relativePaths,
      },
      estudiantes: {
        hombres: estudiantesHombres.relativePaths,
        mujeres: estudiantesMujeres.relativePaths,
      },
    },
  };

  const allScanResults = [
    hogaresAlta,
    hogaresMedia,
    hogaresBaja,
    habitacionesAlta,
    habitacionesMedia,
    habitacionesBaja,
    duenosHombres,
    duenosMujeres,
    estudiantesHombres,
    estudiantesMujeres,
  ];

  const totalCatalogFiles = allScanResults.reduce(
    (sum, res) => sum + res.relativePaths.length,
    0,
  );
  console.log(`Total curated catalog WebP files discovered: ${totalCatalogFiles}`);

  const uploadTasks: UploadTask[] = [];
  for (const scanResult of allScanResults) {
    for (let i = 0; i < scanResult.relativePaths.length; i++) {
      const relPath = scanResult.relativePaths[i];
      const localPath = scanResult.fullPaths[i];
      uploadTasks.push({
        localPath,
        relativePath: relPath,
        s3Key: `dev/${relPath}`,
      });
      uploadTasks.push({
        localPath,
        relativePath: relPath,
        s3Key: `prod/${relPath}`,
      });
    }
  }

  console.log(`Prepared ${uploadTasks.length} upload targets (dev/ and prod/)`);

  let completed = 0;
  await executePool(uploadTasks, 20, async (task) => {
    await uploadFileWithRetry(task);
    completed++;
    if (completed % 100 === 0 || completed === uploadTasks.length) {
      console.log(`Progress: ${completed}/${uploadTasks.length} targets synced`);
    }
  });

  const outputDir = path.resolve(process.cwd(), 'prisma', 'data');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const manifestPath = path.join(outputDir, 'assets-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Assets manifest generated successfully at: ${manifestPath}`);
};

run().catch((error: unknown) => {
  console.error('Asset synchronization failed:', error);
  process.exit(1);
});
