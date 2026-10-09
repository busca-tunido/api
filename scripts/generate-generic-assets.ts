import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

if (typeof process.loadEnvFile === 'function') {
  process.loadEnvFile();
}

const BUCKET = process.env.PUBLIC_STORAGE_BUCKET || 'uploads';
const ENDPOINT =
  process.env.AWS_ENDPOINT_URL_S3 ||
  'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech';
const REGION = process.env.AWS_REGION || 'us-east-2';

const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  forcePathStyle: true,
});

const generateFallbackSvg = (): string => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F1F5F9" />
      <stop offset="100%" stop-color="#CBD5E1" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8FAFC" />
    </linearGradient>
    <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#334155" flood-opacity="0.1" />
    </filter>
  </defs>

  <rect width="1200" height="800" fill="url(#bgGrad)" />

  <g opacity="0.25" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="6 10">
    <line x1="0" y1="200" x2="1200" y2="200" />
    <line x1="0" y1="400" x2="1200" y2="400" />
    <line x1="0" y1="600" x2="1200" y2="600" />
    <line x1="300" y1="0" x2="300" y2="800" />
    <line x1="600" y1="0" x2="600" y2="800" />
    <line x1="900" y1="0" x2="900" y2="800" />
  </g>

  <g filter="url(#cardShadow)">
    <rect x="380" y="210" width="440" height="380" rx="36" fill="url(#cardGrad)" stroke="#E2E8F0" stroke-width="2" />
    
    <g transform="translate(600, 360)">
      <path d="M -80 10 L 0 -60 L 80 10" fill="none" stroke="#64748B" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 45 -22 L 45 -48 L 62 -48 L 62 -7" fill="none" stroke="#64748B" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M -60 10 L -60 70 A 10 10 0 0 0 -50 80 L 50 80 A 10 10 0 0 0 60 70 L 60 10" fill="none" stroke="#64748B" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
      
      <line x1="-36" y1="40" x2="-36" y2="66" stroke="#94A3B8" stroke-width="6" stroke-linecap="round" />
      <rect x="-28" y="44" width="22" height="14" rx="4" fill="#94A3B8" />
      <line x1="-36" y1="58" x2="36" y2="58" stroke="#94A3B8" stroke-width="6" stroke-linecap="round" />
      <line x1="36" y1="48" x2="36" y2="66" stroke="#94A3B8" stroke-width="6" stroke-linecap="round" />
    </g>

    <text x="600" y="515" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="700" fill="#475569" letter-spacing="1">
      SIN IMAGEN DISPONIBLE
    </text>
    <text x="600" y="545" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="500" fill="#94A3B8" letter-spacing="0.5">
      BuscaTuNido
    </text>
  </g>
</svg>
`;

const generateAvatarSvg = (variant: 'default' | 'student-male' | 'student-female' | 'landlord-male' | 'landlord-female' | 'moderator' | 'admin'): string => {
  const getBadge = () => {
    if (variant === 'moderator') {
      return `
        <g transform="translate(560, 560)">
          <circle cx="50" cy="50" r="48" fill="#475569" stroke="#FFFFFF" stroke-width="8" />
          <path d="M 50 26 L 68 34 C 68 52 50 68 50 68 C 50 68 32 52 32 34 Z" fill="#94A3B8" stroke="#FFFFFF" stroke-width="3" />
          <path d="M 44 48 L 48 52 L 56 42" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        </g>
      `;
    }
    if (variant === 'admin') {
      return `
        <g transform="translate(560, 560)">
          <circle cx="50" cy="50" r="48" fill="#334155" stroke="#FFFFFF" stroke-width="8" />
          <path d="M 50 26 L 56 38 L 70 40 L 59 50 L 62 64 L 50 56 L 38 64 L 41 50 L 30 40 L 44 38 Z" fill="#F1F5F9" />
        </g>
      `;
    }
    return '';
  };

  const getFigure = () => {
    switch (variant) {
      case 'student-male':
        return `
          <!-- Male Student: short hair style + casual neckline + hoodie line -->
          <!-- Torso -->
          <path d="M 220 720 Q 220 540 330 510 L 400 550 L 470 510 Q 580 540 580 720 Z" fill="#64748B" />
          <path d="M 330 510 Q 400 570 470 510" fill="none" stroke="#94A3B8" stroke-width="8" stroke-linecap="round" />
          <!-- Neck -->
          <rect x="365" y="440" width="70" height="90" rx="16" fill="#94A3B8" />
          <!-- Head -->
          <circle cx="400" cy="350" r="115" fill="#94A3B8" />
          <!-- Short modern hair -->
          <path d="M 285 340 C 285 230 330 210 400 210 C 470 210 515 230 515 320 C 500 310 470 300 440 305 C 410 310 370 290 320 335 C 300 350 290 345 285 340 Z" fill="#475569" />
        `;
      case 'student-female':
        return `
          <!-- Female Student: ponytail/medium hair + scoop collar -->
          <!-- Ponytail behind -->
          <path d="M 460 300 Q 550 310 560 410 Q 520 460 470 420 Z" fill="#475569" />
          <!-- Torso -->
          <path d="M 230 720 Q 230 550 340 520 L 400 550 L 460 520 Q 570 550 570 720 Z" fill="#64748B" />
          <path d="M 340 520 Q 400 580 460 520" fill="none" stroke="#CBD5E1" stroke-width="6" stroke-linecap="round" />
          <!-- Neck -->
          <rect x="372" y="445" width="56" height="85" rx="14" fill="#94A3B8" />
          <!-- Head -->
          <circle cx="400" cy="355" r="110" fill="#94A3B8" />
          <!-- Female Hair front/top -->
          <path d="M 290 360 C 285 240 330 215 400 215 C 470 215 510 240 510 360 C 495 310 450 280 400 285 C 350 290 310 320 290 360 Z" fill="#475569" />
        `;
      case 'landlord-male':
        return `
          <!-- Adult Landlord Male: parted hair + collared shirt -->
          <!-- Torso -->
          <path d="M 210 720 Q 210 530 325 500 L 400 540 L 475 500 Q 590 530 590 720 Z" fill="#475569" />
          <!-- Shirt collar -->
          <polygon points="400,540 355,490 380,480 400,515 420,480 445,490" fill="#F1F5F9" />
          <!-- Neck -->
          <rect x="365" y="430" width="70" height="90" rx="14" fill="#94A3B8" />
          <!-- Head -->
          <circle cx="400" cy="345" r="115" fill="#94A3B8" />
          <!-- Classic parted adult hair -->
          <path d="M 285 330 C 285 220 335 205 400 205 C 465 205 515 220 515 315 C 490 285 450 275 400 275 C 350 275 315 295 285 330 Z" fill="#334155" />
        `;
      case 'landlord-female':
        return `
          <!-- Adult Landlord Female: elegant bob hairstyle + blouse collar -->
          <!-- Torso -->
          <path d="M 225 720 Q 225 540 335 510 L 400 545 L 465 510 Q 575 540 575 720 Z" fill="#475569" />
          <!-- V-Neck blouse -->
          <polygon points="400,555 370,505 400,495 430,505" fill="#F1F5F9" />
          <!-- Neck -->
          <rect x="372" y="440" width="56" height="85" rx="12" fill="#94A3B8" />
          <!-- Head -->
          <circle cx="400" cy="350" r="110" fill="#94A3B8" />
          <!-- Elegant Bob Haircut framing face -->
          <path d="M 280 390 C 275 240 325 210 400 210 C 475 210 525 240 520 390 C 505 410 490 380 490 320 C 490 270 450 260 400 260 C 350 260 310 270 310 320 C 310 380 295 410 280 390 Z" fill="#334155" />
        `;
      default:
        return `
          <!-- Default Unisex Silhouette -->
          <!-- Torso -->
          <path d="M 220 720 Q 220 530 330 500 L 400 535 L 470 500 Q 580 530 580 720 Z" fill="#64748B" />
          <!-- Neck -->
          <rect x="365" y="435" width="70" height="90" rx="16" fill="#94A3B8" />
          <!-- Head -->
          <circle cx="400" cy="345" r="120" fill="#94A3B8" />
        `;
    }
  };

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <linearGradient id="bgCircGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F8FAFC" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
    <clipPath id="avatarClip">
      <circle cx="400" cy="400" r="360" />
    </clipPath>
  </defs>

  <!-- Circular background with subtle border -->
  <circle cx="400" cy="400" r="370" fill="#CBD5E1" />
  <circle cx="400" cy="400" r="360" fill="url(#bgCircGrad)" />

  <!-- Clipped Character Figure -->
  <g clip-path="url(#avatarClip)">
    ${getFigure()}
  </g>

  <!-- Badge if applicable -->
  ${getBadge()}
</svg>
  `;
};

async function main() {
  console.log(`=== GENERATING & SYNCHRONIZING GENERIC ASSETS TO NEON S3 ===`);
  console.log(`Bucket: ${BUCKET} | Endpoint: ${ENDPOINT}`);

  const uploads: Array<{ key: string; svg: string }> = [
    // 1. Single fallback image
    {
      key: 'v1/shared/fallbacks/fallback.webp',
      svg: generateFallbackSvg(),
    },
    // 2. Generic Gray Avatars
    {
      key: 'v1/shared/avatars/avatar-default.webp',
      svg: generateAvatarSvg('default'),
    },
    {
      key: 'v1/shared/avatars/avatar-student-male.webp',
      svg: generateAvatarSvg('student-male'),
    },
    {
      key: 'v1/shared/avatars/avatar-student-female.webp',
      svg: generateAvatarSvg('student-female'),
    },
    {
      key: 'v1/shared/avatars/avatar-landlord-male.webp',
      svg: generateAvatarSvg('landlord-male'),
    },
    {
      key: 'v1/shared/avatars/avatar-landlord-female.webp',
      svg: generateAvatarSvg('landlord-female'),
    },
    {
      key: 'v1/shared/avatars/avatar-moderator.webp',
      svg: generateAvatarSvg('moderator'),
    },
    {
      key: 'v1/shared/avatars/avatar-admin.webp',
      svg: generateAvatarSvg('admin'),
    },
    // Compatibility aliases for existing scripts / references
    {
      key: 'v1/shared/avatars/avatar-student-cl-m.webp',
      svg: generateAvatarSvg('student-male'),
    },
    {
      key: 'v1/shared/avatars/avatar-student-cl-w.webp',
      svg: generateAvatarSvg('student-female'),
    },
    {
      key: 'v1/shared/avatars/avatar-student-lat-w.webp',
      svg: generateAvatarSvg('student-female'),
    },
    {
      key: 'v1/shared/avatars/avatar-landlord-cl-m.webp',
      svg: generateAvatarSvg('landlord-male'),
    },
    {
      key: 'v1/shared/avatars/avatar-landlord-cl-w.webp',
      svg: generateAvatarSvg('landlord-female'),
    },
  ];

  console.log(`\n1. Rendering ${uploads.length} assets with Sharp and uploading to S3...`);
  for (const item of uploads) {
    const webpBuffer = await sharp(Buffer.from(item.svg))
      .webp({ quality: 90, effort: 6 })
      .toBuffer();

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: item.key,
        Body: webpBuffer,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    console.log(`  ✓ Uploaded ${item.key} (${webpBuffer.length} bytes)`);
  }

  console.log(`\n2. Cleaning up obsolete fallbacks in S3...`);
  const fallbacksList = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'v1/shared/fallbacks/',
    }),
  );

  const keysToDelete: Array<{ Key: string }> = [];
  fallbacksList.Contents?.forEach((obj) => {
    if (obj.Key && obj.Key !== 'v1/shared/fallbacks/fallback.webp') {
      keysToDelete.push({ Key: obj.Key });
    }
  });

  // Also remove any accidental 'uploads/' prefix keys
  const accidentalUploads = await s3.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: 'uploads/',
    }),
  );
  accidentalUploads.Contents?.forEach((obj) => {
    if (obj.Key) {
      keysToDelete.push({ Key: obj.Key });
    }
  });

  if (keysToDelete.length > 0) {
    console.log(`  Deleting ${keysToDelete.length} obsolete/stray keys:`);
    keysToDelete.forEach((k) => console.log(`    - ${k.Key}`));
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: keysToDelete,
          Quiet: true,
        },
      }),
    );
    console.log(`  ✓ Obsolete keys deleted.`);
  } else {
    console.log(`  ✓ No obsolete keys to delete.`);
  }

  console.log(`\n=== COMPLETED SUCCESSFULLY ===`);
}

main().catch((err) => {
  console.error('Fatal error generating generic assets:', err);
  process.exit(1);
});
