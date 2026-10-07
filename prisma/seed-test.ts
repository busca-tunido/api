import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fakerES_MX as faker } from '@faker-js/faker';
import type {
  GenderPreference,
  ProposalStatus,
  ProposalType,
  ReportReason,
  ReportStatus,
  Role,
  RoomType,
  StayDurationCategory,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  AMENITY_DEFINITIONS,
  assignCityToUniversity,
  createPrismaClient,
  fetchAndValidateChileCities,
  fetchAndValidateUniversities,
  generateShortName,
  slugify,
} from './seed-utils.js';

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

interface EmbeddedPensionImageSeed {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: Date;
}

interface EmbeddedRoomSeed {
  id: string;
  roomNumber: string;
  title: string;
  description: string;
  type: RoomType;
  monthlyPrice: number;
  deposit: number | null;
  hasPrivateBathroom: boolean;
  totalBeds: number;
  availableBeds: number;
  isAvailable: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

interface EmbeddedNearbyUniversitySeed {
  universityId: string;
  name: string;
  shortName: string | null;
  distanceMeters: number;
  walkingMinutes: number;
  transitMinutes: number;
}

const STORAGE_BASE_URL =
  process.env.PUBLIC_NEON_STORAGE_BASE_URL ||
  'https://br-gentle-butterfly-aevuizs0.storage.c-2.us-east-2.aws.neon.tech/uploads';
const ENV_PREFIX = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

const getAssetUrl = (relPath: string): string => {
  return `${STORAGE_BASE_URL}/${ENV_PREFIX}/${relPath}`;
};

const CITY_BASE_MEDIAN: Record<string, number> = {
  Santiago: 290000,
  Valparaíso: 260000,
  Concepción: 240000,
  Valdivia: 250000,
};

const TIER_MULTIPLIER: Record<'alta' | 'media' | 'baja', number> = {
  alta: 1.25,
  media: 1.0,
  baja: 0.82,
};

const calculateBasePrice = (city: string, tier: 'alta' | 'media' | 'baja'): number => {
  const median = CITY_BASE_MEDIAN[city] || 260000;
  const multiplier = TIER_MULTIPLIER[tier];
  const dispersion = Math.floor(Math.random() * 60000) - 25000;
  const rawPrice = median * multiplier + dispersion;
  const rounded = Math.round(rawPrice / 5000) * 5000;
  return Math.max(165000, Math.min(430000, rounded));
};

const calculateRoomPrice = (
  basePrice: number,
  type: RoomType,
  hasPrivateBathroom: boolean,
): number => {
  let price = basePrice;
  if (type === 'SHARED') {
    const discount = 0.2 + Math.random() * 0.15;
    price = basePrice * (1 - discount);
  } else if (type === 'STUDIO') {
    const markup = 0.25 + Math.random() * 0.2;
    price = basePrice * (1 + markup);
  } else {
    const variation = Math.random() * 0.1 - 0.05;
    price = basePrice * (1 + variation);
  }
  if (type === 'SINGLE' && hasPrivateBathroom) {
    price *= 1.15;
  }
  return Math.round(price / 5000) * 5000;
};

const MALE_NAMES = [
  'Matías',
  'Sebastián',
  'Nicolás',
  'Benjamín',
  'Joaquín',
  'Vicente',
  'Tomás',
  'Martín',
  'Felipe',
  'Diego',
  'Cristóbal',
  'Lucas',
  'Carlos',
  'Eduardo',
  'Jorge',
  'Patricio',
  'Gonzalo',
  'Rodrigo',
  'Andrés',
  'Ignacio',
  'Gabriel',
  'Francisco',
  'Manuel',
  'Alonso',
  'Álvaro',
  'Esteban',
  'Claudio',
];

const FEMALE_NAMES = [
  'Camila',
  'Valentina',
  'Sofía',
  'Fernanda',
  'Constanza',
  'Javiera',
  'Francisca',
  'Catalina',
  'Isidora',
  'Paz',
  'Daniela',
  'Paulina',
  'Carla',
  'María',
  'Carmen',
  'Rosa',
  'Patricia',
  'Claudia',
  'Gloria',
  'Elena',
  'Macarena',
  'Bárbara',
  'Antonia',
  'Gabriela',
  'Loreto',
  'Paula',
  'Andrea',
];

const LAST_NAMES = [
  'González',
  'Muñoz',
  'Rojas',
  'Díaz',
  'Pérez',
  'Soto',
  'Contreras',
  'Silva',
  'Martínez',
  'Sepúlveda',
  'Morales',
  'Rodríguez',
  'López',
  'Fuentes',
  'Hernández',
  'Torres',
  'Araya',
  'Flores',
  'Espinoza',
  'Valenzuela',
  'Castillo',
  'Tapia',
  'Reyes',
  'Gutiérrez',
  'Castro',
  'Pizarro',
  'Álvarez',
];

type ReviewProfile =
  | 'ZERO'
  | 'FEW_CONSISTENT'
  | 'FEW_VARIED'
  | 'MID_CONSISTENT'
  | 'MID_VARIED'
  | 'MANY_CONSISTENT'
  | 'MANY_VARIED';

const determineReviewProfile = (): ReviewProfile => {
  const rand = Math.random();
  if (rand < 0.15) return 'ZERO';
  if (rand < 0.45) return Math.random() < 0.5 ? 'FEW_CONSISTENT' : 'FEW_VARIED';
  if (rand < 0.8) return Math.random() < 0.5 ? 'MID_CONSISTENT' : 'MID_VARIED';
  return Math.random() < 0.5 ? 'MANY_CONSISTENT' : 'MANY_VARIED';
};

const generateRatingsForProfile = (
  profile: ReviewProfile,
  tier: 'alta' | 'media' | 'baja',
): number[] => {
  if (profile === 'ZERO') return [];

  const count = profile.startsWith('FEW')
    ? faker.number.int({ min: 1, max: 2 })
    : profile.startsWith('MID')
      ? faker.number.int({ min: 3, max: 4 })
      : faker.number.int({ min: 5, max: 7 });

  const isVaried = profile.endsWith('VARIED');
  const baseTarget = tier === 'alta' ? 5 : tier === 'media' ? 4 : 3;

  const ratings: number[] = [];
  for (let i = 0; i < count; i++) {
    if (isVaried) {
      if (i % 2 === 0) {
        ratings.push(faker.helpers.arrayElement([4, 5]));
      } else {
        ratings.push(faker.helpers.arrayElement([1, 2, 3]));
      }
    } else {
      const delta = faker.helpers.arrayElement([0, 0, -1, 0, 1]);
      ratings.push(Math.max(1, Math.min(5, baseTarget + delta)));
    }
  }

  return ratings;
};

const calculateHaversineMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const REVIEW_COMMENTS = [
  'Excelente pensión, muy cerca del campus y con locomoción directa.',
  'Muy buen ambiente de estudio, el internet vuela y los espacios son limpios.',
  'La dueña es súper amable y comprensiva con las fechas de exámenes.',
  'Habitación amplia, cómoda y con buena luz natural para estudiar.',
  'Cumple con lo básico para cursar el semestre, aunque la calefacción podría mejorar.',
  'Ubicación privilegiada en un barrio tranquilo y residencial.',
  'Buena relación precio calidad para estudiantes de región.',
  'Los servicios incluidos facilitan mucho la estadía durante el año académico.',
  'Un poco ruidoso en las mañanas pero en general una grata estadía.',
  'Excelente opción estudiantil, la cocina y los baños se mantienen impecables.',
];

const run = async (): Promise<void> => {
  console.log('=== Starting Enhanced Seed Pipeline on MongoDB Atlas ===');

  const manifestPath = path.resolve(process.cwd(), 'prisma', 'data', 'assets-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Assets manifest not found at ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as AssetsManifest;

  const { prisma } = createPrismaClient();

  console.log('--- Cleaning MongoDB Collections ---');
  await prisma.report.deleteMany({});
  await prisma.pensionProposal.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.pension.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.university.deleteMany({});
  await prisma.amenity.deleteMany({});

  console.log('--- Seeding Amenity Catalog ---');
  const amenityRecords = await Promise.all(
    AMENITY_DEFINITIONS.map((def) =>
      prisma.amenity.create({
        data: {
          slug: def.slug,
          name: def.name,
          category: def.category,
          iconKey: def.iconKey,
        },
      }),
    ),
  );

  console.log('--- Fetching Universities and Chilean Cities ---');
  const [rawUnis, validCities] = await Promise.all([
    fetchAndValidateUniversities(),
    fetchAndValidateChileCities(),
  ]);

  const universityRecords = await Promise.all(
    rawUnis.map((uni) => {
      const city = assignCityToUniversity(uni.name, validCities);
      return prisma.university.create({
        data: {
          name: uni.name,
          shortName: generateShortName(uni.name),
          emailDomains: uni.domains,
          city: city.city,
          address: `Campus Central ${uni.name}, ${city.city}`,
          latitude: city.latitude + (Math.random() - 0.5) * 0.015,
          longitude: city.longitude + (Math.random() - 0.5) * 0.015,
        },
      });
    }),
  );

  console.log('--- Seeding Landlords and Moderator ---');
  const defaultPasswordHash = await bcrypt.hash('ContrasenaSegura123!', 10);

  await prisma.user.create({
    data: {
      email: 'moderator@buscatunido.cl',
      passwordHash: defaultPasswordHash,
      firstName: 'Staff',
      lastName: 'Moderador',
      role: 'MODERATOR' as Role,
      isEmailVerified: true,
      avatarUrl: getAssetUrl(manifest.perfiles.duenos.hombres[0]),
    },
  });

  const landlordUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }> = [];
  const TOTAL_LANDLORDS = 40;

  for (let i = 0; i < TOTAL_LANDLORDS; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale
      ? MALE_NAMES[i % MALE_NAMES.length]
      : FEMALE_NAMES[i % FEMALE_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const avatarRel = isMale
      ? manifest.perfiles.duenos.hombres[i % manifest.perfiles.duenos.hombres.length]
      : manifest.perfiles.duenos.mujeres[i % manifest.perfiles.duenos.mujeres.length];

    const email = `${slugify(`arrendador.${firstName}.${lastName}.${i + 1}`)}@gmail.com`;
    const phone = `+569${faker.string.numeric(8)}`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        phone,
        role: 'LANDLORD' as Role,
        isEmailVerified: true,
        avatarUrl: getAssetUrl(avatarRel),
      },
    });

    landlordUsers.push({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone,
    });
  }

  console.log('--- Seeding Student Users with Gender-Aligned Avatars ---');
  const studentUsers: Array<{ id: string; email: string; isEmailVerified: boolean }> = [];
  const TOTAL_STUDENTS = 200;

  for (let i = 0; i < TOTAL_STUDENTS; i++) {
    const isMale = i % 2 === 0;
    const firstName = isMale
      ? MALE_NAMES[i % MALE_NAMES.length]
      : FEMALE_NAMES[i % FEMALE_NAMES.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const avatarRel = isMale
      ? manifest.perfiles.estudiantes.hombres[i % manifest.perfiles.estudiantes.hombres.length]
      : manifest.perfiles.estudiantes.mujeres[i % manifest.perfiles.estudiantes.mujeres.length];

    const uni = universityRecords[i % universityRecords.length];
    const domain = uni.emailDomains[0] || 'alumnos.cl';
    const email = `${slugify(`${firstName}.${lastName}.${i + 1}`)}@${domain}`;

    const student = await prisma.user.create({
      data: {
        email,
        passwordHash: defaultPasswordHash,
        firstName,
        lastName,
        role: 'STUDENT' as Role,
        isEmailVerified: Math.random() < 0.85,
        universityId: uni.id,
        avatarUrl: getAssetUrl(avatarRel),
      },
    });

    studentUsers.push({
      id: student.id,
      email: student.email,
      isEmailVerified: student.isEmailVerified,
    });
  }

  console.log('--- Seeding Multi-Tier Pensions and Embedded Subdocuments ---');
  const TOTAL_PENSIONS = 60;
  const pensionRecords: Array<{
    id: string;
    tier: 'alta' | 'media' | 'baja';
    images: string[];
  }> = [];

  for (let i = 0; i < TOTAL_PENSIONS; i++) {
    const tier: 'alta' | 'media' | 'baja' = i < 15 ? 'alta' : i < 45 ? 'media' : 'baja';

    const cityObj = validCities[i % validCities.length];
    const city = cityObj.city;
    const landlord = landlordUsers[i % landlordUsers.length];

    const basePrice = calculateBasePrice(city, tier);
    const street = faker.location.street();
    const title = `Residencia ${city} ${street} #${i + 1}`;
    const slug = `${slugify(title)}-${i + 1}`;

    const latOffset = (Math.random() - 0.5) * 0.02;
    const lngOffset = (Math.random() - 0.5) * 0.02;
    const latitude = Number((cityObj.latitude + latOffset).toFixed(6));
    const longitude = Number((cityObj.longitude + lngOffset).toFixed(6));

    let selectedAmenities: string[] = [];
    if (tier === 'baja') {
      const basicSlugs = amenityRecords
        .filter((a) => a.category === 'BASIC_UTILITY')
        .map((a) => a.slug);
      selectedAmenities = faker.helpers.arrayElements(basicSlugs, { min: 3, max: 5 });
    } else if (tier === 'media') {
      const mediaPool = amenityRecords
        .filter((a) => ['BASIC_UTILITY', 'ROOM_FEATURE', 'COMMON_AREA'].includes(a.category))
        .map((a) => a.slug);
      selectedAmenities = faker.helpers.arrayElements(mediaPool, { min: 6, max: 9 });
    } else {
      const altaPool = amenityRecords.map((a) => a.slug);
      selectedAmenities = faker.helpers.arrayElements(altaPool, { min: 10, max: 15 });
    }

    const tierHouseCatalog = manifest.hogares[tier];
    const numHouseImgs = faker.number.int({ min: 3, max: 5 });
    const chosenHouseImgs = faker.helpers.arrayElements(tierHouseCatalog, numHouseImgs);

    const embeddedImages: EmbeddedPensionImageSeed[] = chosenHouseImgs.map((relPath, idx) => ({
      id: crypto.randomUUID(),
      url: getAssetUrl(relPath),
      thumbnailUrl: getAssetUrl(relPath),
      caption: idx === 0 ? 'Fachada principal' : `Área compartida ${idx}`,
      isFeatured: idx === 0,
      sortOrder: idx,
      createdAt: new Date(),
    }));

    const tierRoomCatalog = manifest.habitaciones[tier];
    const numRooms = faker.number.int({ min: 2, max: 4 });
    const embeddedRooms: EmbeddedRoomSeed[] = [];
    const allRoomPhotos: string[] = [];

    for (let r = 1; r <= numRooms; r++) {
      const roomType: RoomType = faker.helpers.arrayElement([
        'SINGLE',
        'SINGLE',
        'SHARED',
        'STUDIO',
      ]);
      const hasPrivateBath = roomType === 'STUDIO' ? true : Math.random() < 0.4;
      const roomPrice = calculateRoomPrice(basePrice, roomType, hasPrivateBath);

      const pickedRoomRelPaths = faker.helpers.arrayElements(tierRoomCatalog, { min: 1, max: 2 });
      const roomPhotoUrls = pickedRoomRelPaths.map(getAssetUrl);
      allRoomPhotos.push(...roomPhotoUrls);

      embeddedRooms.push({
        id: crypto.randomUUID(),
        roomNumber: `Hab ${r * 10 + r}`,
        title: `Pieza ${roomType === 'SINGLE' ? 'Individual' : roomType === 'SHARED' ? 'Compartida' : 'Estudio'} #${r}`,
        description: `Habitación equipada para estudiante con escritorio y clóset. ${hasPrivateBath ? 'Baño privado.' : 'Baño compartido.'}`,
        type: roomType,
        monthlyPrice: roomPrice,
        deposit: roomPrice,
        hasPrivateBathroom: hasPrivateBath,
        totalBeds: roomType === 'SHARED' ? 2 : 1,
        availableBeds: 1,
        isAvailable: true,
        images: roomPhotoUrls,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
    }

    const nearbyUnisInCity = universityRecords.filter(
      (u) => u.city.toLowerCase() === city.toLowerCase(),
    );
    const assignedUnis = nearbyUnisInCity.slice(0, 2);
    const embeddedUnis: EmbeddedNearbyUniversitySeed[] = assignedUnis.map((uni) => {
      const distMeters = calculateHaversineMeters(latitude, longitude, uni.latitude, uni.longitude);
      return {
        universityId: uni.id,
        name: uni.name,
        shortName: uni.shortName,
        distanceMeters: distMeters,
        walkingMinutes: Math.round(distMeters / 80),
        transitMinutes: Math.round(distMeters / 250 + 4),
      };
    });

    const pension = await prisma.pension.create({
      data: {
        slug,
        title,
        description: `Excelente pensión universitaria ubicada en ${city}, ideal para alumnos que buscan tranquilidad y cercanía al campus. Conectividad expedita y servicios incluidos.`,
        address: `${street} ${faker.number.int({ min: 100, max: 2500 })}`,
        city,
        neighborhood: city,
        latitude,
        longitude,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        contactName: `${landlord.firstName} ${landlord.lastName}`,
        contactPhone: landlord.phone,
        contactWhatsapp: landlord.phone,
        contactEmail: landlord.email,
        baseMonthlyPrice: basePrice,
        deposit: basePrice,
        currency: 'CLP',
        waterIncluded: true,
        electricityIncluded: true,
        gasIncluded: true,
        internetIncluded: true,
        verificationStatus:
          tier === 'alta'
            ? 'OFFICIALLY_VERIFIED'
            : tier === 'media'
              ? 'COMMUNITY_VERIFIED'
              : 'UNVERIFIED',
        genderPreference: 'ANY' as GenderPreference,
        amenities: selectedAmenities,
        rooms: embeddedRooms,
        images: embeddedImages,
        nearbyUniversities: embeddedUnis,
        landlordId: landlord.id,
        submittedById: landlord.id,
        ratingAverage: 0,
        ratingCount: 0,
        communityScore: 0,
        isActive: true,
      },
    });

    pensionRecords.push({
      id: pension.id,
      tier,
      images: [...embeddedImages.map((img) => img.url), ...allRoomPhotos],
    });
  }

  console.log('--- Generating Stochastic Reviews and Bayesian Reputation ---');
  let zeroReviewCount = 0;
  let variedReviewCount = 0;

  for (const pensionInfo of pensionRecords) {
    const profile = determineReviewProfile();
    if (profile === 'ZERO') {
      zeroReviewCount++;
      continue;
    }
    if (profile.endsWith('VARIED')) {
      variedReviewCount++;
    }

    const ratings = generateRatingsForProfile(profile, pensionInfo.tier);
    const chosenStudents = faker.helpers.arrayElements(studentUsers, ratings.length);

    for (let rIdx = 0; rIdx < ratings.length; rIdx++) {
      const overall = ratings[rIdx];
      const student = chosenStudents[rIdx];

      const hasPhotos = Math.random() < 0.35;
      const reviewPhotos = hasPhotos
        ? faker.helpers.arrayElements(pensionInfo.images, { min: 1, max: 2 })
        : [];

      const numHelpful = faker.number.int({ min: 0, max: 8 });
      const helpfulVoters = faker.helpers.arrayElements(studentUsers, numHelpful).map((s) => s.id);

      await prisma.review.create({
        data: {
          pensionId: pensionInfo.id,
          userId: student.id,
          overallRating: overall,
          cleanlinessRating: Math.min(
            5,
            Math.max(1, overall + faker.helpers.arrayElement([-1, 0, 1])),
          ),
          landlordRating: Math.min(
            5,
            Math.max(1, overall + faker.helpers.arrayElement([-1, 0, 1])),
          ),
          quietnessRating: Math.min(
            5,
            Math.max(1, overall + faker.helpers.arrayElement([-1, 0, 1])),
          ),
          wifiRating: Math.min(5, Math.max(1, overall + faker.helpers.arrayElement([0, 1, 0]))),
          comment: faker.helpers.arrayElement(REVIEW_COMMENTS),
          stayDurationCategory: 'ONE_SEMESTER' as StayDurationCategory,
          stayStartDate: new Date('2025-03-01'),
          stayEndDate: new Date('2025-07-15'),
          exactStayDays: 136,
          isResidentVerified: student.isEmailVerified,
          images: reviewPhotos,
          helpfulUserIds: helpfulVoters,
        },
      });
    }

    const sum = ratings.reduce((acc, val) => acc + val, 0);
    const count = ratings.length;
    const avg = Number((sum / count).toFixed(2));

    const priorWeight = 3;
    const priorMean = 3.5;
    const bayesianRating =
      (count / (count + priorWeight)) * avg + (priorWeight / (count + priorWeight)) * priorMean;
    const communityScore = Math.round((bayesianRating / 5.0) * 1000) / 10;

    await prisma.pension.update({
      where: { id: pensionInfo.id },
      data: {
        ratingAverage: avg,
        ratingCount: count,
        communityScore,
      },
    });
  }

  console.log(
    `Pensions with ZERO reviews: ${zeroReviewCount}/${TOTAL_PENSIONS} (${((zeroReviewCount / TOTAL_PENSIONS) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Pensions with VARIED reviews: ${variedReviewCount}/${TOTAL_PENSIONS} (${((variedReviewCount / TOTAL_PENSIONS) * 100).toFixed(1)}%)`,
  );

  console.log('--- Seeding Moderation Reports ---');
  for (let i = 0; i < 15; i++) {
    const pension = pensionRecords[i % pensionRecords.length];
    const student = studentUsers[i % studentUsers.length];

    await prisma.report.create({
      data: {
        pensionId: pension.id,
        userId: student.id,
        reason: 'INACCURATE_PRICE' as ReportReason,
        description: 'El precio acordado presencialmente no concuerda con la publicación.',
        status: 'PENDING' as ReportStatus,
      },
    });
  }

  console.log('--- Seeding Sample Proposals ---');
  const demoPension = pensionRecords[0];
  const demoStudent = studentUsers[0];
  await prisma.pensionProposal.create({
    data: {
      pensionId: demoPension.id,
      submittedById: demoStudent.id,
      type: 'AMENITIES_UPDATE' as ProposalType,
      status: 'PENDING' as ProposalStatus,
      proposedChanges: {
        amenitiesToAdd: ['wifi-alta-velocidad', 'calefaccion'],
      },
      submissionNotes: 'Sugerencia de servicios adicionales disponibles en el inmueble.',
    },
  });

  console.log('=== Database Seeding Complete on MongoDB Atlas ===');
};

run().catch((error: unknown) => {
  console.error('Database seeding failed:', error);
  process.exit(1);
});
