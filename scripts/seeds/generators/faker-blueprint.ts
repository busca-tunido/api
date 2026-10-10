import crypto from 'node:crypto';
import { fakerES_MX as faker } from '@faker-js/faker';
import type {
  GenderPreference,
  Role,
  RoomType,
  StayDurationCategory,
  VerificationStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  CITY_BASE_MEDIAN,
  CITY_NEIGHBORHOODS,
  CURATED_COUNTS,
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
  PensionAiPromptContext,
  ReviewAiPromptContext,
} from '../types.js';
import {
  calculateHaversineMeters,
  calculateTransitMinutes,
  calculateWalkingMinutes,
} from './haversine.js';

export interface ValidatedCity {
  city: string;
  latitude: number;
  longitude: number;
  isPrimary: boolean;
}

export interface UniversityRecord {
  id: string;
  name: string;
  shortName: string | null;
  emailDomains: string[];
  city: string;
  latitude: number;
  longitude: number;
}

export interface AmenityRecord {
  id: string;
  slug: string;
  name: string;
  category: string;
}

export interface BlueprintDataset {
  users: DraftUser[];
  pensions: DraftPension[];
  reviews: DraftReview[];
}

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

const generateGenericPensionDescription = (
  city: string,
  neighborhood: string,
  tier: TierKey,
): string => {
  const intro =
    tier === 'alta'
      ? 'Residencia universitaria de alto estándar'
      : tier === 'media'
        ? 'Pensión estudiantil acogedora y funcional'
        : 'Alojamiento universitario económico y práctico';
  return `${intro} ubicada en ${neighborhood}, ${city}. Ambiente tranquilo diseñado para el estudio, con conectividad y servicios básicos garantizados.`;
};

const generateGenericReviewComment = (rating: number, authorGender: 'MALE' | 'FEMALE'): string => {
  const satisfiedAdj = authorGender === 'FEMALE' ? 'conforme' : 'conforme';
  if (rating >= 4) {
    return `Muy buena pensión, quedé bastante ${satisfiedAdj} con la estadía durante el semestre. Recomendable.`;
  }
  if (rating === 3) {
    return 'Cumple con lo justo para cursar el semestre, aunque hay detalles de convivencia y mantención por mejorar.';
  }
  return 'Mala experiencia durante mi estadía. Tuve constantes inconvenientes con los servicios básicos y la tranquilidad.';
};

const createDeterministicObjectId = (seed: string): string =>
  crypto.createHash('md5').update(seed).digest('hex').substring(0, 24);

export const generateBlueprintDataset = async (
  validCities: ValidatedCity[],
  universityRecords: UniversityRecord[],
  amenityRecords: AmenityRecord[],
): Promise<BlueprintDataset> => {
  const defaultPasswordHash = await bcrypt.hash('Student123!', 10);
  const users: DraftUser[] = [];

  const demoLandlord: DraftUser = {
    id: createDeterministicObjectId('landlord-demo'),
    email: 'arrendador.demo@gmail.com',
    passwordHash: defaultPasswordHash,
    firstName: 'Arrendador',
    lastName: 'Demo',
    phone: '+56912345678',
    avatarUrl: getLandlordAvatarUrl(true, 0),
    role: 'LANDLORD' as Role,
    gender: 'MALE',
    universityId: null,
  };
  users.push(demoLandlord);

  const landlordUsers: DraftUser[] = [demoLandlord];

  for (let i = 0; i < TOTAL_LANDLORDS; i++) {
    const isMale = i % 2 === 0;
    const gender: 'MALE' | 'FEMALE' = isMale ? 'MALE' : 'FEMALE';
    const firstName = isMale ? faker.person.firstName('male') : faker.person.firstName('female');
    const lastName = faker.person.lastName();
    const email = `arrendador.${faker.string.alphanumeric(6).toLowerCase()}@gmail.com`;
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
    email: 'estudiante.demo@uchile.cl',
    passwordHash: defaultPasswordHash,
    firstName: 'Estudiante',
    lastName: 'Demo',
    phone: '+56987654321',
    avatarUrl: getStudentAvatarUrl(false, 0),
    role: 'STUDENT' as Role,
    gender: 'FEMALE',
    universityId: uchileUni.id,
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
    const email = `estudiante.${faker.string.alphanumeric(6).toLowerCase()}@${domain}`;

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
    };
    users.push(user);
    studentUsers.push(user);
  }

  const pensionCityList: ValidatedCity[] = [];
  for (const [cityName, targetCount] of Object.entries(IMPORTANT_CITY_TARGETS)) {
    const cityObj = validCities.find((c) => c.city.toLowerCase() === cityName.toLowerCase());
    if (cityObj) {
      for (let i = 0; i < targetCount; i++) {
        pensionCityList.push(cityObj);
      }
    }
  }

  const otherCities = validCities.filter(
    (c) =>
      !Object.keys(IMPORTANT_CITY_TARGETS).some((k) => k.toLowerCase() === c.city.toLowerCase()),
  );
  const fallbackPool = otherCities.length > 0 ? otherCities : validCities;
  for (let i = 0; i < 16; i++) {
    if (fallbackPool.length > 0) {
      pensionCityList.push(fallbackPool[i % fallbackPool.length]);
    }
  }

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
    const genericTitle = `Pensión Universitaria ${neighborhood} #${i + 1}`;
    const slug = `pension-${faker.string.alphanumeric(8).toLowerCase()}-${i + 1}`;

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

    const tierHouseMax = CURATED_COUNTS.houses[TIER_MAP[tier]];
    const numHouseImgs = faker.number.int({ min: 3, max: 5 });
    const pickedHouseIndices = faker.helpers.arrayElements(
      Array.from({ length: tierHouseMax }, (_, idx) => idx + 1),
      numHouseImgs,
    );

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

    const tierRoomMax = CURATED_COUNTS.rooms[TIER_MAP[tier]];
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

      const pickedRoomIndices = faker.helpers.arrayElements(
        Array.from({ length: tierRoomMax }, (_, idx) => idx + 1),
        { min: 1, max: 2 },
      );
      const roomPhotoUrls = pickedRoomIndices.map((idx) => getRoomImageUrl(tier, idx));

      rooms.push({
        id: crypto.randomUUID(),
        roomNumber: `Hab ${r * 10 + r}`,
        title: `Pieza ${roomType === 'SINGLE' ? 'Individual' : roomType === 'SHARED' ? 'Compartida' : 'Estudio'} #${r}`,
        description: `Habitación equipada con escritorio. ${hasPrivateBath ? 'Baño privado.' : 'Baño compartido.'}`,
        type: roomType,
        monthlyPrice: roomPrice,
        deposit: roomPrice,
        hasPrivateBathroom: hasPrivateBath,
        totalBeds: roomType === 'SHARED' ? 2 : 1,
        availableBeds: 1,
        isAvailable: true,
        images: roomPhotoUrls,
      });
    }

    const nearbyUnisInCity = universityRecords.filter(
      (u) => u.city.toLowerCase() === city.toLowerCase(),
    );
    const assignedUnis =
      nearbyUnisInCity.length > 0
        ? faker.helpers.arrayElements(nearbyUnisInCity, {
            min: 1,
            max: Math.min(3, nearbyUnisInCity.length),
          })
        : universityRecords.slice(0, 1);

    const nearbyUniversities: DraftNearbyUniversity[] = assignedUnis.map((uni) => {
      const distMeters = calculateHaversineMeters(latitude, longitude, uni.latitude, uni.longitude);
      return {
        universityId: uni.id,
        name: uni.name,
        shortName: uni.shortName,
        distanceMeters: distMeters,
        walkingMinutes: calculateWalkingMinutes(distMeters),
        transitMinutes: calculateTransitMinutes(distMeters),
      };
    });

    const pension: DraftPension = {
      id: createDeterministicObjectId(`pension-${i}`),
      slug,
      title: genericTitle,
      description: generateGenericPensionDescription(city, neighborhood, tier),
      address: `${street} ${faker.number.int({ min: 100, max: 2500 })}`,
      city,
      neighborhood,
      latitude,
      longitude,
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
      curfewTime: tier === 'alta' ? null : '23:30',
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
    };

    pensions.push(pension);
  }

  const reviews: DraftReview[] = [];

  for (const pension of pensions) {
    const reviewCount =
      pension.tier === 'alta'
        ? faker.number.int({ min: 2, max: 4 })
        : pension.tier === 'media'
          ? faker.number.int({ min: 1, max: 3 })
          : faker.number.int({ min: 0, max: 2 });

    const reviewers = faker.helpers.arrayElements(studentUsers, reviewCount);

    for (let revIdx = 0; revIdx < reviewers.length; revIdx++) {
      const reviewer = reviewers[revIdx];
      const baseTarget = pension.tier === 'alta' ? 5 : pension.tier === 'media' ? 4 : 3;
      const delta = faker.helpers.arrayElement([0, 0, -1, 0, 1]);
      const overallRating = Math.max(1, Math.min(5, baseTarget + delta));

      const review: DraftReview = {
        id: createDeterministicObjectId(`review-${pension.id}-${revIdx}`),
        pensionId: pension.id,
        userId: reviewer.id,
        overallRating,
        cleanlinessRating: overallRating,
        landlordRating: overallRating,
        quietnessRating: Math.max(1, overallRating - 1),
        wifiRating: overallRating,
        comment: generateGenericReviewComment(overallRating, reviewer.gender),
        stayDurationCategory: 'ONE_SEMESTER' as StayDurationCategory,
        isResidentVerified: Math.random() < 0.7,
        authorGender: reviewer.gender,
        authorFirstName: reviewer.firstName,
      };

      reviews.push(review);
    }
  }

  return {
    users,
    pensions,
    reviews,
  };
};

export const extractPensionAiPromptContext = (pension: DraftPension): PensionAiPromptContext => {
  const nearest = pension.nearbyUniversities[0];
  const uniName = nearest?.shortName || nearest?.name || 'la universidad local';
  const walking = nearest?.walkingMinutes || 8;

  const roomsSummary = `${pension.rooms.length} habitaciones (${pension.rooms.filter((r) => r.type === 'SINGLE').length} individuales, ${pension.rooms.filter((r) => r.hasPrivateBathroom).length} con baño privado)`;

  const rules: string[] = [];
  if (pension.curfewTime) rules.push(`toque de queda ${pension.curfewTime}`);
  if (pension.quietHoursStart) rules.push(`horario de silencio desde ${pension.quietHoursStart}`);
  if (!pension.guestsAllowed) rules.push('sin visitas nocturnas');

  return {
    id: pension.id,
    city: pension.city,
    neighborhood: pension.neighborhood,
    tier: pension.tier,
    nearestUniName: uniName,
    walkingMinutes: walking,
    amenitiesList: pension.amenities.slice(0, 5),
    roomsSummary,
    rulesSummary: rules.join(', ') || 'normas estándar de convivencia',
    landlordName: pension.contactName,
  };
};

export const extractReviewAiPromptContext = (
  review: DraftReview,
  pension: DraftPension,
): ReviewAiPromptContext => {
  const nearest = pension.nearbyUniversities[0];
  const uniName = nearest?.shortName || nearest?.name || 'la universidad';

  const sentiment =
    review.overallRating <= 2 ? 'enojado' : review.overallRating === 3 ? 'neutral' : 'contento';

  const highlightAspect =
    review.overallRating >= 4
      ? faker.helpers.arrayElement([
          'excelente ubicación cerca del campus',
          'buena calefacción e internet rápido',
          'anfitrión muy comprensivo y amable',
        ])
      : review.overallRating === 3
        ? faker.helpers.arrayElement([
            'espacio básico pero ruidoso',
            'buena ubicación pero wifi inestable',
            'cocina compartida pequeña',
          ])
        : faker.helpers.arrayElement([
            'cortes de agua caliente y frío en invierno',
            'mucho ruido nocturno y cero tranquilidad para estudiar',
            'dueño poco empático con los acuerdos',
          ]);

  return {
    id: review.id,
    city: pension.city,
    nearestUniName: uniName,
    authorName: review.authorFirstName,
    authorGender: review.authorGender,
    overallRating: review.overallRating,
    sentiment,
    highlightAspect,
  };
};
