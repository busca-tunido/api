import fs from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const ENDPOINT = 'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech';
const REGION = 'us-east-2';
const BUCKET = 'uploads';
const ACCESS_KEY_ID = 'nak_live_9c5bfe8530bc42578f7920b49b2e1d34';
const SECRET_ACCESS_KEY = 'nsk_live_6e3ba69871f790c39ed0c96b3af1ca2df0f30c120459a067cc16cb738e28effe';

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

type ImageEntry = {
  file: string;
  key: string;
};

const IMAGES: ImageEntry[] = [
  { file: 'room_single_classic_1789520147947.jpg', key: 'room-single-classic.webp' },
  { file: 'room_shared_double_1789520203689.jpg', key: 'room-shared-double.webp' },
  { file: 'room_single_minimalist_1789520285669.jpg', key: 'room-single-minimalist.webp' },
  { file: 'room_studio_compact_1789520359014.jpg', key: 'room-studio-compact.webp' },
  { file: 'room_attic_cozy_1789520435918.jpg', key: 'room-attic-cozy.webp' },
  { file: 'room_spacious_balcony_1789520451934.jpg', key: 'room-spacious-balcony.webp' },
  { file: 'student_studio_room_1789518824165.jpg', key: 'room-studio-modern.webp' },
  { file: 'student_single_room_1789518061517.jpg', key: 'room-single-cozy.webp' },
];

const BASE_DIR = 'C:\\Users\\tkdgi\\.gemini\\antigravity-ide\\brain\\4c552b6b-ceea-487c-a9a5-3eb572342a90';

const run = async (): Promise<void> => {
  const uploadedUrls: string[] = [];

  for (const img of IMAGES) {
    const filePath = path.join(BASE_DIR, img.file);
    const rawBuffer = await fs.readFile(filePath);

    const webpBuffer = await sharp(rawBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: img.key,
        Body: webpBuffer,
        ContentType: 'image/webp',
      }),
    );

    const publicUrl = `${ENDPOINT}/${BUCKET}/${img.key}`;
    console.log(`Uploaded ${img.key} -> ${publicUrl}`);
    uploadedUrls.push(publicUrl);
  }

  console.log('\nAll URLs:');
  console.log(JSON.stringify(uploadedUrls, null, 2));
};

run().catch((err: unknown) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
