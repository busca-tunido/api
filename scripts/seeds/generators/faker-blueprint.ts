import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fakerES_MX as faker } from '@faker-js/faker';
import type {
  GenderPreference,
  RoomType,
  StayDurationCategory,
  VerificationStatus,
} from '@prisma/client';
import type { Role } from '@prisma/sql-client';
import bcrypt from 'bcryptjs';
import {
  CITY_BASE_MEDIAN,
  CITY_NEIGHBORHOODS,
  CURATED_COUNTS,
  DEMO_USERS,
  IMPORTANT_CITY_TARGETS,
  STORAGE_BASE_URL,
  TIER_MAP,
  TIER_MULTIPLIER,
  type TierKey,
  TOTAL_LANDLORDS,
  TOTAL_STUDENTS,
} from '../config.js';
import type {
  DraftNearbyUniversity,
  DraftPension,
  DraftPensionImage,
  DraftReview,
  DraftRoom,
  DraftUser,
  SituationsCatalog,
} from '../types.js';
import {
  calculateHaversineMeters,
  calculateTransitMinutes,
  calculateWalkingMinutes,
} from './haversine.js';
import { generateSafePensionCoordinates } from './water-exclusion.js';

export type ValidatedCity = {
  city: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
};

export type UniversityRecord = {
  id: string;
  name: string;
  shortName: string | null;
  emailDomains: string[];
  city: string;
  latitude: number;
  longitude: number;
};

export type AmenityRecord = {
  id: string;
  slug: string;
  name: string;
  category: string;
};

export type BlueprintDataset = {
  users: DraftUser[];
  pensions: DraftPension[];
  reviews: DraftReview[];
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const situationsPath = path.resolve(currentDir, '../data/seed-situations.json');
const situations: SituationsCatalog = JSON.parse(fs.readFileSync(situationsPath, 'utf-8'));

const generatePensionTitle = (tier: TierKey, neighborhood: string, index: number): string => {
  const prefixes = situations.pensions.titlePrefixes[tier];
  const prefix = prefixes[index % prefixes.length];
  return `${prefix} ${neighborhood} #${index + 1}`;
};

const generatePensionDescription = (
  tier: TierKey,
  neighborhood: string,
  city: string,
  universityName: string,
  walkingMinutes: number,
  curfewRule: string,
  contactName: string,
  index: number,
): string => {
  const templates = situations.pensions.descriptions[tier];
  const template = templates[index % templates.length];
  return template
    .replaceAll('{neighborhood}', neighborhood)
    .replaceAll('{city}', city)
    .replaceAll('{university}', universityName)
    .replaceAll('{walkingMinutes}', String(walkingMinutes))
    .replaceAll('{curfewRule}', curfewRule)
    .replaceAll('{contactName}', contactName);
};

const generateRoomDescription = (
  roomType: RoomType,
  hasPrivateBathroom: boolean,
  index: number,
): string => {
  const bathKey = hasPrivateBathroom ? 'PRIVATE_BATH' : 'SHARED_BATH';
  const pool = situations.rooms[roomType][bathKey];
  return pool[index % pool.length];
};

const generateReviewComment = (rating: number, index: number): string => {
  const key = String(rating) as '1' | '2' | '3' | '4' | '5';
  const pool = situations.reviews[key];
  return pool[index % pool.length].comment;
};

const getHouseImageUrl = (tier: TierKey, index: number): string =>
  `${STORAGE_BASE_URL}/v1/shared/curated/houses/${TIER_MAP[tier]}/${index}.webp`;

const getRoomImageUrl = (tier: TierKey, index: number): string =>
  `${STORAGE_BASE_URL}/v1/shared/curated/rooms/${TIER_MAP[tier]}/${index}.webp`;

const getLandlordAvatarUrl = (isMale: boolean, index: number): string =>
  `${STORAGE_BASE_URL}/v1/shared/curated/profiles/landlords/${isMale ? 'men' : 'women'}/${(index % 150) + 1}.webp`;

const getStudentAvatarUrl = (isMale: boolean, index: number): string =>
  `${STORAGE_BASE_URL}/v1/shared/curated/profiles/students/${isMale ? 'men' : 'women'}/${(index % 150) + 1}.webp`;

const calculateBasePrice = (city: string, tier: TierKey): number => {
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

export const createDeterministicObjectId = (seed: string): string =>
  crypto.createHash('md5').update(seed).digest('hex').substring(0, 24);

const HOUSE_INDEX_POOLS: Record<TierKey, readonly number[]> = {
  alta: Array.from({ length: CURATED_COUNTS.houses.high }, (_, idx) => idx + 1),
  media: Array.from({ length: CURATED_COUNTS.houses.mid }, (_, idx) => idx + 1),
  baja: Array.from({ length: CURATED_COUNTS.houses.budget }, (_, idx) => idx + 1),
};

const ROOM_INDEX_POOLS: Record<TierKey, readonly number[]> = {
  alta: Array.from({ length: CURATED_COUNTS.rooms.high }, (_, idx) => idx + 1),
  media: Array.from({ length: CURATED_COUNTS.rooms.mid }, (_, idx) => idx + 1),
  baja: Array.from({ length: CURATED_COUNTS.rooms.budget }, (_, idx) => idx + 1),
};

export type PensionMediaSource = {
  images: readonly { url: string }[];
  rooms: readonly { images: readonly string[] }[];
};

export const MAX_REVIEW_IMAGES = 3;

export const selectReviewImagesForPension = (
  pension: PensionMediaSource,
  seedIndex: number,
): string[] => {
  const mod = ((seedIndex % 20) + 20) % 20;
  if (mod < 14) {
    return [];
  }

  const roomPhotos = pension.rooms.flatMap((room) => room.images);
  const pensionPhotos = pension.images.map((img) => img.url);
  const uniquePool = Array.from(new Set([...roomPhotos, ...pensionPhotos])).filter(Boolean);

  if (uniquePool.length === 0) {
    return [];
  }

  const targetCount = mod < 17 ? 1 : mod < 19 ? 2 : MAX_REVIEW_IMAGES;
  const desiredCount = Math.min(targetCount, uniquePool.length, MAX_REVIEW_IMAGES);
  return faker.helpers.arrayElements(uniquePool, desiredCount);
};

export const generateBlueprintDataset = async (
  validCities: ValidatedCity[],
  universityRecords: UniversityRecord[],
  amenityRecords: AmenityRecord[],
): Promise<BlueprintDataset> => {
  const defaultPasswordHash = await bcrypt.hash(DEMO_USERS.student.password, 10);
  const users: DraftUser[] = [];

  const demoLandlord: DraftUser = {
    id: createDeterministicObjectId('landlord-demo'),
    email: DEMO_USERS.landlord.email,
    passwordHash: defaultPasswordHash,
    firstName: DEMO_USERS.landlord.firstName,
    lastName: DEMO_USERS.landlord.lastName,
    phone: DEMO_USERS.landlord.phone,
    avatarUrl: getLandlordAvatarUrl(true, 0),
    role: 'LANDLORD' as Role,
    gender: 'MALE',
    universityId: null,
    favoritePensionIds: [],
  };
  users.push(demoLandlord);

  const landlordUsers: DraftUser[] = [demoLandlord];

  for (let i = 0; i < TOTAL_LANDLORDS; i++) {
    const isMale = i % 2 === 0;
    const gender: 'MALE' | 'FEMALE' = isMale ? 'MALE' : 'FEMALE';
    const firstName = isMale ? faker.person.firstName('male') : faker.person.firstName('female');
    const lastName = faker.person.lastName();
    const email = `arrendador.${i}.${faker.string.alphanumeric(4).toLowerCase()}@gmail.com`;
    const phone = `+569${faker.string.numeric(8)}`;

    const user: DraftUser = {
      id: createDeterministicObjectId(`landlord-${i}`),
      email,
      passwordHash: defaultPasswordHash,
      firstName,
      lastName,
      phone,
      avatarUrl: getLandlordAvatarUrl(isMale, i),
      role: 'LANDLORD' as Role,
      gender,
      universityId: null,
      favoritePensionIds: [],
    };
    users.push(user);
    landlordUsers.push(user);
  }

  const uchileUni =
    universityRecords.find(
      (u) =>
        u.name.toLowerCase().includes('universidad de chile') ||
        u.emailDomains.includes('uchile.cl'),
    ) || universityRecords[0];

  const demoStudent: DraftUser = {
    id: createDeterministicObjectId('student-demo'),
    email: DEMO_USERS.student.email,
    passwordHash: defaultPasswordHash,
    firstName: DEMO_USERS.student.firstName,
    lastName: DEMO_USERS.student.lastName,
    phone: DEMO_USERS.student.phone,
    avatarUrl: getStudentAvatarUrl(false, 0),
    role: 'STUDENT' as Role,
    gender: 'FEMALE',
    universityId: uchileUni.id,
    favoritePensionIds: [],
  };
  users.push(demoStudent);
  const studentUsers: DraftUser[] = [demoStudent];

  for (let i = 0; i < TOTAL_STUDENTS; i++) {
    const isMale = i % 2 === 0;
    const gender: 'MALE' | 'FEMALE' = isMale ? 'MALE' : 'FEMALE';
    const firstName = isMale ? faker.person.firstName('male') : faker.person.firstName('female');
    const lastName = faker.person.lastName();
    const uni = universityRecords[i % universityRecords.length];
    const domain = uni.emailDomains[0] || 'alumnos.cl';
    const email = `estudiante.${i}.${faker.string.alphanumeric(4).toLowerCase()}@${domain}`;

    const user: DraftUser = {
      id: createDeterministicObjectId(`student-${i}`),
      email,
      passwordHash: defaultPasswordHash,
      firstName,
      lastName,
      phone: `+569${faker.string.numeric(8)}`,
      avatarUrl: getStudentAvatarUrl(isMale, i),
      role: 'STUDENT' as Role,
      gender,
      universityId: uni.id,
      favoritePensionIds: [],
    };
    users.push(user);
    studentUsers.push(user);
  }

  const cityLookup = new Map<string, ValidatedCity>();
  for (const c of validCities) {
    cityLookup.set(c.city.toLowerCase(), c);
  }

  const pensionCityList: ValidatedCity[] = [];
  const importantCityKeys = new Set(
    Object.keys(IMPORTANT_CITY_TARGETS).map((k) => k.toLowerCase()),
  );
  for (const [cityName, targetCount] of Object.entries(IMPORTANT_CITY_TARGETS)) {
    const cityObj = cityLookup.get(cityName.toLowerCase());
    if (cityObj) {
      for (let i = 0; i < targetCount; i++) {
        pensionCityList.push(cityObj);
      }
    }
  }

  const otherCities = validCities.filter((c) => !importantCityKeys.has(c.city.toLowerCase()));
  const fallbackPool = otherCities.length > 0 ? otherCities : validCities;
  for (let i = 0; i < 16; i++) {
    if (fallbackPool.length > 0) {
      pensionCityList.push(fallbackPool[i % fallbackPool.length]);
    }
  }

  const universitiesByCity = new Map<string, UniversityRecord[]>();
  for (const uni of universityRecords) {
    const key = uni.city.toLowerCase();
    const list = universitiesByCity.get(key) ?? [];
    list.push(uni);
    universitiesByCity.set(key, list);
  }

  const amenityPools: Record<TierKey, readonly string[]> = {
    baja: amenityRecords.filter((a) => a.category === 'ROOM_FEATURE').map((a) => a.slug),
    media: amenityRecords
      .filter((a) => a.category === 'ROOM_FEATURE' || a.category === 'COMMON_AREA')
      .map((a) => a.slug),
    alta: amenityRecords.map((a) => a.slug),
  };

  const pensions: DraftPension[] = [];

  for (let i = 0; i < pensionCityList.length; i++) {
    const tier: TierKey = i % 3 === 0 ? 'alta' : i % 3 === 1 ? 'media' : 'baja';
    const cityObj = pensionCityList[i];
    const city = cityObj.city;
    const landlord = landlordUsers[i % landlordUsers.length];

    const basePrice = calculateBasePrice(city, tier);
    const street = faker.location.street();
    const neighborhoodList = CITY_NEIGHBORHOODS[city];
    const neighborhood = neighborhoodList ? faker.helpers.arrayElement(neighborhoodList) : city;
    const slug = `pension-${i + 1}-${faker.string.alphanumeric(6).toLowerCase()}`;

    const localUniversities = universitiesByCity.get(city.toLowerCase()) ?? [];
    const { latitude, longitude } = generateSafePensionCoordinates(cityObj, localUniversities);

    const amenityBounds =
      tier === 'baja'
        ? { min: 2, max: 4 }
        : tier === 'media'
          ? { min: 4, max: 7 }
          : { min: 7, max: 12 };
    const selectedAmenities = faker.helpers.arrayElements(amenityPools[tier], amenityBounds);

    const numHouseImgs = faker.number.int({ min: 3, max: 5 });
    const pickedHouseIndices = faker.helpers.arrayElements(HOUSE_INDEX_POOLS[tier], numHouseImgs);

    const images: DraftPensionImage[] = pickedHouseIndices.map((imgIdx, idx) => {
      const imgUrl = getHouseImageUrl(tier, imgIdx);
      return {
        id: crypto.randomUUID(),
        url: imgUrl,
        thumbnailUrl: imgUrl,
        caption: idx === 0 ? 'Fachada principal' : `Área compartida ${idx}`,
        isFeatured: idx === 0,
        sortOrder: idx,
      };
    });

    const numRooms = faker.number.int({ min: 2, max: 4 });
    const rooms: DraftRoom[] = [];

    for (let r = 1; r <= numRooms; r++) {
      const roomType: RoomType = faker.helpers.arrayElement([
        'SINGLE',
        'SINGLE',
        'SHARED',
        'STUDIO',
      ]);
      const hasPrivateBath = roomType === 'STUDIO' ? true : Math.random() < 0.4;
      const roomPrice = calculateRoomPrice(basePrice, roomType, hasPrivateBath);

      const pickedRoomIndices = faker.helpers.arrayElements(ROOM_INDEX_POOLS[tier], {
        min: 1,
        max: 2,
      });
      const roomPhotoUrls = pickedRoomIndices.map((idx) => getRoomImageUrl(tier, idx));

      rooms.push({
        id: crypto.randomUUID(),
        roomNumber: `Hab ${r * 10 + r}`,
        title: `Pieza ${roomType === 'SINGLE' ? 'Individual' : roomType === 'SHARED' ? 'Compartida' : 'Estudio'} #${r}`,
        description: generateRoomDescription(roomType, hasPrivateBath, i * 10 + r),
        type: roomType,
        monthlyPrice: roomPrice,
        deposit: roomPrice,
        hasPrivateBathroom: hasPrivateBath,
        totalBeds: roomType === 'SHARED' ? 2 : 1,
        availableBeds: 1,
        isAvailable: true,
        isActive: true,
        images: roomPhotoUrls,
      });
    }

    const universitiesWithDistance = universityRecords
      .map((uni) => {
        const distMeters = calculateHaversineMeters(
          latitude,
          longitude,
          uni.latitude,
          uni.longitude,
        );
        return {
          universityId: uni.id,
          name: uni.name,
          shortName: uni.shortName,
          distanceMeters: distMeters,
          walkingMinutes: calculateWalkingMinutes(distMeters),
          transitMinutes: calculateTransitMinutes(distMeters),
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const in5kmRadius = universitiesWithDistance.filter((u) => u.distanceMeters <= 5000);
    const nearbyUniversities: DraftNearbyUniversity[] =
      in5kmRadius.length > 0 ? in5kmRadius.slice(0, 4) : universitiesWithDistance.slice(0, 1);

    const availableRooms = rooms.filter((r) => r.isAvailable);
    const resolvedBasePrice =
      availableRooms.length > 0
        ? Math.min(...availableRooms.map((r) => r.monthlyPrice))
        : basePrice;

    const nearest = nearbyUniversities[0];
    const uniName = nearest?.shortName || nearest?.name || 'la universidad local';
    const walking = nearest?.walkingMinutes || 8;
    const curfewTime = tier === 'alta' ? null : '23:30';
    const curfewRule = curfewTime ? `toque de queda ${curfewTime} hrs` : 'sin restricción horaria';
    const contactName = `${landlord.firstName} ${landlord.lastName}`;

    const title = generatePensionTitle(tier, neighborhood, i);
    const description = generatePensionDescription(
      tier,
      neighborhood,
      city,
      uniName,
      walking,
      curfewRule,
      contactName,
      i,
    );

    const pension: DraftPension = {
      id: createDeterministicObjectId(`pension-${i}`),
      slug,
      title,
      description,
      address: `${street} ${faker.number.int({ min: 100, max: 2500 })}`,
      city,
      neighborhood,
      latitude,
      longitude,
      contactName,
      contactPhone: landlord.phone,
      contactWhatsapp: landlord.phone,
      contactEmail: landlord.email,
      baseMonthlyPrice: resolvedBasePrice,
      deposit: resolvedBasePrice,
      currency: 'CLP',
      waterIncluded: true,
      electricityIncluded: true,
      gasIncluded: true,
      internetIncluded: true,
      curfewTime,
      guestsAllowed: tier === 'alta',
      smokingAllowed: false,
      petsAllowed: tier === 'alta',
      genderPreference: 'ANY' as GenderPreference,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      verificationStatus: (tier === 'alta'
        ? 'OFFICIALLY_VERIFIED'
        : tier === 'media'
          ? 'COMMUNITY_VERIFIED'
          : 'UNVERIFIED') as VerificationStatus,
      tier,
      amenities: selectedAmenities,
      rooms,
      images,
      nearbyUniversities,
      landlordId: landlord.id,
      ratingAverage: 0,
      ratingCount: 0,
      communityScore: 0,
    };

    pensions.push(pension);
  }

  const pensionIds = pensions.map((p) => p.id);
  for (const student of studentUsers) {
    const isDemo = student.email === DEMO_USERS.student.email;
    const favCount = isDemo ? 3 : (student.id.charCodeAt(0) % 3) + 1;
    student.favoritePensionIds = pensionIds.slice(0, Math.min(favCount, pensionIds.length));
  }

  const reviews: DraftReview[] = [];
  const priorWeight = 3;
  const priorMean = 3.5;

  for (const pension of pensions) {
    const reviewCount =
      pension.tier === 'alta'
        ? faker.number.int({ min: 2, max: 4 })
        : pension.tier === 'media'
          ? faker.number.int({ min: 1, max: 3 })
          : faker.number.int({ min: 0, max: 2 });

    const reviewers = faker.helpers.arrayElements(studentUsers, reviewCount);
    let ratingSum = 0;

    for (let revIdx = 0; revIdx < reviewers.length; revIdx++) {
      const reviewer = reviewers[revIdx];
      const baseTarget = pension.tier === 'alta' ? 5 : pension.tier === 'media' ? 4 : 3;
      const delta = faker.helpers.arrayElement([0, 0, -1, 0, 1]);
      const overallRating = Math.max(1, Math.min(5, baseTarget + delta));
      ratingSum += overallRating;

      const review: DraftReview = {
        id: createDeterministicObjectId(`review-${pension.id}-${revIdx}`),
        pensionId: pension.id,
        userId: reviewer.id,
        overallRating,
        cleanlinessRating: overallRating,
        landlordRating: overallRating,
        quietnessRating: Math.max(1, overallRating - 1),
        wifiRating: overallRating,
        comment: generateReviewComment(overallRating, reviews.length),
        images: selectReviewImagesForPension(pension, reviews.length),
        stayDurationCategory: 'ONE_SEMESTER' as StayDurationCategory,
        isResidentVerified: Math.random() < 0.7,
        authorGender: reviewer.gender,
        authorFirstName: reviewer.firstName,
      };

      reviews.push(review);
    }

    if (reviewers.length > 0) {
      const avg = Number((ratingSum / reviewers.length).toFixed(2));
      const bayesianRating =
        (reviewers.length / (reviewers.length + priorWeight)) * avg +
        (priorWeight / (reviewers.length + priorWeight)) * priorMean;
      pension.ratingAverage = avg;
      pension.ratingCount = reviewers.length;
      pension.communityScore = Math.round((bayesianRating / 5.0) * 1000) / 10;
    }
  }

  return {
    users,
    pensions,
    reviews,
  };
};
