import fs from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand, S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const ENDPOINT = 'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech';
const REGION = 'us-east-2';
const BUCKET = 'uploads';
const ACCESS_KEY_ID = 'nak_live_5119d554e20e489985285a1b82735d4a';
const SECRET_ACCESS_KEY = 'nsk_live_54448ce989196e9fe59fba014565858d1157f0dfbab8d88bb56366550ca72350';

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const EXTERNAL_IMAGES: Array<{ url: string; key: string; category: string }> = [
  // Ciudades
  { url: 'https://images.unsplash.com/photo-1549880338-65ddcdfd017b', key: 'cities/santiago.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090', key: 'cities/valparaiso.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390', key: 'cities/concepcion.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb', key: 'cities/valdivia.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', key: 'cities/temuco.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', key: 'cities/norte-costa.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82', key: 'cities/city-default.webp', category: 'city' },
  { url: 'https://images.unsplash.com/photo-1579888944880-d98341245702', key: 'cities/city-mock.webp', category: 'city' },

  // Universidades
  { url: 'https://images.unsplash.com/photo-1562774053-701939374585', key: 'universities/uchile-classic.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f', key: 'universities/puc-campus.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b', key: 'universities/udec-campanil.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952', key: 'universities/uv-patio.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a', key: 'universities/utfsm-library.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1576495199011-eb94736d05d6', key: 'universities/uach-nature.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644', key: 'universities/udp-students.webp', category: 'university' },
  { url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1', key: 'universities/finis-modern.webp', category: 'university' },

  // Habitaciones y Fallbacks
  { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af', key: 'rooms/room-fallback.webp', category: 'room' },
  { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267', key: 'pensions/stay-history-fallback.webp', category: 'pension' },
  { url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5', key: 'pensions/pension-mock-facade.webp', category: 'pension' },

  // Avatares base existentes
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb', key: 'avatars/avatar-admin.webp', category: 'avatar' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', key: 'avatars/avatar-moderator.webp', category: 'avatar' },
];

const LOCAL_GENERATED_IMAGES: Array<{ file: string; key: string }> = [
  { file: 'good_student_room_1789882741105.jpg', key: 'rooms/pension-room-good.webp' },
  { file: 'normal_student_room_1789882763701.jpg', key: 'rooms/pension-room-normal.webp' },
  { file: 'worn_student_room_1789882791360.jpg', key: 'rooms/pension-room-worn.webp' },
  { file: 'avatar_student_cl_w_1789882820656.jpg', key: 'avatars/avatar-student-cl-w.webp' },
  { file: 'avatar_student_cl_m_1789882852581.jpg', key: 'avatars/avatar-student-cl-m.webp' },
  { file: 'avatar_student_lat_w_1789882888037.jpg', key: 'avatars/avatar-student-lat-w.webp' },
  { file: 'avatar_landlord_cl_m_1789882927262.jpg', key: 'avatars/avatar-landlord-cl-m.webp' },
  { file: 'avatar_landlord_cl_w_1789882971308.jpg', key: 'avatars/avatar-landlord-cl-w.webp' },
];

const BRAIN_DIR = 'C:\\Users\\tkdgi\\.gemini\\antigravity-ide\\brain\\63a78798-bc78-4828-b4a5-a322b7cf9311';

async function uploadBufferToS3(key: string, buffer: Buffer): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: 'image/webp',
    }),
  );
  return `${ENDPOINT}/${BUCKET}/${key}`;
}

async function main(): Promise<void> {
  const urlMap: Record<string, string> = {};

  console.log('=== Step 1: Processing External Unsplash Images ===');
  for (const item of EXTERNAL_IMAGES) {
    const fetchUrl = `${item.url}?auto=format&fit=crop&w=1200&q=80`;
    console.log(`Downloading ${fetchUrl}...`);

    try {
      const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        console.warn(`[SKIP 404/Error] ${item.url} responded with ${res.status}`);
        continue;
      }

      const arrayBuffer = await res.arrayBuffer();
      const rawBuffer = Buffer.from(arrayBuffer);

      const resizeWidth = item.category === 'avatar' ? 400 : 1200;
      const webpBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: resizeWidth, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();

      const publicUrl = await uploadBufferToS3(item.key, webpBuffer);
      urlMap[item.url] = publicUrl;
      console.log(`[OK] ${item.key} -> ${publicUrl}`);
    } catch (err) {
      console.error(`[ERROR] Failed to process ${item.url}:`, err);
    }
  }

  console.log('\n=== Step 2: Processing Local AI-Generated Images ===');
  for (const item of LOCAL_GENERATED_IMAGES) {
    const localPath = path.join(BRAIN_DIR, item.file);
    try {
      console.log(`Reading local generated image ${localPath}...`);
      const rawBuffer = await fs.readFile(localPath);

      const isAvatar = item.key.startsWith('avatars/');
      const resizeWidth = isAvatar ? 600 : 1400;

      const webpBuffer = await sharp(rawBuffer)
        .rotate()
        .resize({ width: resizeWidth, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const publicUrl = await uploadBufferToS3(item.key, webpBuffer);
      urlMap[item.file] = publicUrl;
      console.log(`[OK GENERATED] ${item.key} -> ${publicUrl}`);
    } catch (err) {
      console.error(`[ERROR] Failed to process local image ${item.file}:`, err);
    }
  }

  console.log('\n=== Step 3: Verifying Public HTTP Availability ===');
  let verifiedCount = 0;
  for (const [source, publicUrl] of Object.entries(urlMap)) {
    try {
      const headRes = await fetch(publicUrl, { method: 'HEAD', signal: AbortSignal.timeout(6000) });
      if (headRes.ok) {
        verifiedCount++;
      } else {
        console.warn(`[HTTP FAIL] ${publicUrl} returned status ${headRes.status}`);
      }
    } catch (err) {
      console.warn(`[HTTP HEAD ERROR] ${publicUrl}:`, err);
    }
  }

  console.log(`\nVerified ${verifiedCount}/${Object.keys(urlMap).length} URLs accessible over HTTP.`);

  const mapPath = path.join(process.cwd(), 'scripts', 'image-url-map.json');
  await fs.writeFile(mapPath, JSON.stringify(urlMap, null, 2), 'utf-8');
  console.log(`Saved mapping to ${mapPath}`);
}

main().catch((err: unknown) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
