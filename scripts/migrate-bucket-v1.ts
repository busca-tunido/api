import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile();
}

const ENDPOINT =
  process.env.AWS_ENDPOINT_URL_S3 ||
  'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech';
const REGION = process.env.AWS_REGION || 'us-east-2';
const BUCKET = process.env.PUBLIC_STORAGE_BUCKET || 'uploads';
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  throw new Error('AWS credentials missing in environment.');
}

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

type MigrationTask = {
  sourceKey: string;
  targetKey: string;
};

const executePool = async <T>(
  items: T[],
  concurrency: number,
  handler: (item: T) => Promise<void>,
): Promise<void> => {
  let index = 0;
  const executing = new Set<Promise<void>>();

  while (index < items.length) {
    while (executing.size < concurrency && index < items.length) {
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

const listAllKeys = async (prefix?: string): Promise<string[]> => {
  const keys: string[] = [];
  let token: string | undefined = undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    if (res.Contents) {
      for (const item of res.Contents) {
        if (item.Key) {
          keys.push(item.Key);
        }
      }
    }
    token = res.NextContinuationToken;
  } while (token);

  return keys;
};

const run = async (): Promise<void> => {
  console.log(`Starting S3 Bucket reorganization on ${ENDPOINT}/${BUCKET}`);

  const allKeys = await listAllKeys();
  console.log(`Total current keys in bucket: ${allKeys.length}`);

  const curatedCategoryMappings: Array<{ sourcePrefix: string; targetPrefix: string }> = [
    {
      sourcePrefix: 'dev/habitaciones/alta/',
      targetPrefix: 'v1/shared/curated/rooms/high',
    },
    {
      sourcePrefix: 'dev/habitaciones/media/',
      targetPrefix: 'v1/shared/curated/rooms/mid',
    },
    {
      sourcePrefix: 'dev/habitaciones/baja/',
      targetPrefix: 'v1/shared/curated/rooms/budget',
    },
    {
      sourcePrefix: 'dev/hogares/alta/',
      targetPrefix: 'v1/shared/curated/houses/high',
    },
    {
      sourcePrefix: 'dev/hogares/media/',
      targetPrefix: 'v1/shared/curated/houses/mid',
    },
    {
      sourcePrefix: 'dev/hogares/baja/',
      targetPrefix: 'v1/shared/curated/houses/budget',
    },
    {
      sourcePrefix: 'dev/perfiles/duenos/hombres/',
      targetPrefix: 'v1/shared/curated/profiles/landlords/men',
    },
    {
      sourcePrefix: 'dev/perfiles/duenos/mujeres/',
      targetPrefix: 'v1/shared/curated/profiles/landlords/women',
    },
    {
      sourcePrefix: 'dev/perfiles/estudiantes/hombres/',
      targetPrefix: 'v1/shared/curated/profiles/students/men',
    },
    {
      sourcePrefix: 'dev/perfiles/estudiantes/mujeres/',
      targetPrefix: 'v1/shared/curated/profiles/students/women',
    },
  ];

  const tasks: MigrationTask[] = [];

  for (const mapping of curatedCategoryMappings) {
    const matchingKeys = allKeys
      .filter((k) => k.startsWith(mapping.sourcePrefix) && k.endsWith('.webp'))
      .sort((a, b) => a.localeCompare(b));

    for (let i = 0; i < matchingKeys.length; i++) {
      const sourceKey = matchingKeys[i];
      const targetKey = `${mapping.targetPrefix}/${i + 1}.webp`;
      tasks.push({ sourceKey, targetKey });
    }
  }

  const staticCategories: Array<{ sourcePrefix: string; targetPrefix: string }> = [
    { sourcePrefix: 'cities/', targetPrefix: 'v1/shared/cities/' },
    { sourcePrefix: 'universities/', targetPrefix: 'v1/shared/universities/' },
    { sourcePrefix: 'avatars/', targetPrefix: 'v1/shared/avatars/' },
    { sourcePrefix: 'pensions/', targetPrefix: 'v1/shared/fallbacks/pensions/' },
    { sourcePrefix: 'rooms/', targetPrefix: 'v1/shared/fallbacks/rooms/' },
  ];

  for (const cat of staticCategories) {
    const matching = allKeys.filter((k) => k.startsWith(cat.sourcePrefix));
    for (const key of matching) {
      const fileName = key.slice(cat.sourcePrefix.length);
      if (fileName.length > 0) {
        tasks.push({
          sourceKey: key,
          targetKey: `${cat.targetPrefix}${fileName}`,
        });
      }
    }
  }

  const rootFallbacks = [
    'pension-facade-exterior.webp',
    'pension-patio-garden.webp',
    'pension-shared-kitchen.webp',
    'pension-study-room.webp',
    'room-attic-cozy.webp',
    'room-shared-double.webp',
    'room-single-classic.webp',
    'room-single-cozy.webp',
    'room-single-minimalist.webp',
    'room-spacious-balcony.webp',
    'room-studio-compact.webp',
    'room-studio-modern.webp',
    'student-room-attic.webp',
    'student-shared-room.webp',
    'student-single-room.webp',
    'student-studio-room.webp',
  ];

  for (const fb of rootFallbacks) {
    if (allKeys.includes(fb)) {
      tasks.push({
        sourceKey: fb,
        targetKey: `v1/shared/fallbacks/${fb}`,
      });
    }
  }

  console.log(`Copying ${tasks.length} objects into v1/ layout...`);
  let copyCount = 0;
  await executePool(tasks, 25, async (task) => {
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${encodeURIComponent(task.sourceKey)}`,
        Key: task.targetKey,
      }),
    );
    copyCount++;
    if (copyCount % 100 === 0 || copyCount === tasks.length) {
      console.log(`Copy progress: ${copyCount}/${tasks.length}`);
    }
  });

  const keysToDelete = allKeys.filter((k) => !k.startsWith('v1/'));
  console.log(`Deleting ${keysToDelete.length} obsolete / old keys outside v1/...`);

  let deleteCount = 0;
  await executePool(keysToDelete, 30, async (key) => {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }),
    );
    deleteCount++;
    if (deleteCount % 100 === 0 || deleteCount === keysToDelete.length) {
      console.log(`Delete progress: ${deleteCount}/${keysToDelete.length}`);
    }
  });

  const finalKeys = await listAllKeys();
  console.log(`Migration complete! Total remaining keys in bucket: ${finalKeys.length}`);
  const nonV1 = finalKeys.filter((k) => !k.startsWith('v1/'));
  if (nonV1.length > 0) {
    console.warn(`Warning: ${nonV1.length} keys still exist outside v1/:`, nonV1);
  } else {
    console.log('Verification passed: 100% of keys are now organized inside v1/');
  }
};

run().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
