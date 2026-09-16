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
  { file: 'pension_facade_exterior_1789518008515.jpg', key: 'pension-facade-exterior.webp' },
  { file: 'student_single_room_1789518061517.jpg', key: 'student-single-room.webp' },
  { file: 'student_shared_room_1789518203984.jpg', key: 'student-shared-room.webp' },
  { file: 'pension_study_room_1789518318621.jpg', key: 'pension-study-room.webp' },
  { file: 'pension_shared_kitchen_1789518397894.jpg', key: 'pension-shared-kitchen.webp' },
  { file: 'student_studio_room_1789518824165.jpg', key: 'student-studio-room.webp' },
  { file: 'pension_patio_garden_1789518869991.jpg', key: 'pension-patio-garden.webp' },
  { file: 'student_room_attic_1789518928663.jpg', key: 'student-room-attic.webp' },
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
