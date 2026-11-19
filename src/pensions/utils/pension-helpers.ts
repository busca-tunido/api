import crypto from 'node:crypto';
import {
  calculateHaversineDistanceKm,
  calculateTransitMinutes,
  calculateWalkingMinutes,
} from '../../common/utils/geo.util.js';
import { formatSlugAsTitle } from '../../common/utils/string.util.js';
import type {
  EmbeddedNearbyUniversityRaw,
  EmbeddedPensionImageRaw,
  PaginatedPensions,
  PensionDocRaw,
  PriceHistogramBin,
} from '../types/pension-raw.types.js';

const INCLUDED_UTILITY_SLUGS = new Set(['luz-incluida', 'gas-incluido']);
const WIFI_SLUG = 'wifi-alta-velocidad';
const UPLOADED_PENSION_IMAGE_URL_REGEX =
  /(\/v1\/(?:local|staging|production)\/pensions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.webp$/i;

export const resolvePensionThumbnailUrl = (
  url: string,
  currentThumbnailUrl?: string | null,
): string => {
  const trimmedCurrent = currentThumbnailUrl?.trim();
  if (trimmedCurrent && trimmedCurrent !== url) {
    return trimmedCurrent;
  }
  if (UPLOADED_PENSION_IMAGE_URL_REGEX.test(url)) {
    return url.replace(UPLOADED_PENSION_IMAGE_URL_REGEX, '$1-thumb.webp');
  }
  return trimmedCurrent || url;
};

export const MEAL_AMENITY_SLUGS: readonly string[] = [
  'comida-incluida',
  'pension-completa',
  'media-pension',
  'desayuno-incluido',
  'alimentacion-incluida',
];

export const calculateRelevanceScore = (
  distanceKm: number,
  radiusKm: number,
  ratingAverage: number,
  ratingCount: number,
  verificationStatus: string,
  availableBeds: number,
  hasEssentialUtilities: boolean,
): number => {
  const proximityScore = Math.max(0, 100 * (1 - distanceKm / radiusKm));
  const ratingScore = (ratingAverage / 5.0) * 70 + Math.min(30, ratingCount * 3);
  const verifScore =
    verificationStatus === 'OFFICIALLY_VERIFIED'
      ? 100
      : verificationStatus === 'COMMUNITY_VERIFIED'
        ? 75
        : 30;
  const availScore = (availableBeds > 0 ? 50 : 0) + (hasEssentialUtilities ? 50 : 0);

  const total = 0.4 * proximityScore + 0.25 * ratingScore + 0.2 * verifScore + 0.15 * availScore;
  return Math.round(total * 10) / 10;
};

export const calculatePriceBins = (
  prices: readonly number[],
  minPrice: number,
  maxPrice: number,
  binCount = 28,
): PriceHistogramBin[] => {
  if (prices.length === 0) {
    return [];
  }

  if (minPrice === maxPrice) {
    return Array.from({ length: binCount }, (_, i) => ({
      min: minPrice,
      max: maxPrice,
      count: i === 0 ? prices.length : 0,
    }));
  }

  const step = (maxPrice - minPrice) / binCount;
  const bins: PriceHistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    min: Math.round(minPrice + i * step),
    max: i === binCount - 1 ? maxPrice : Math.round(minPrice + (i + 1) * step),
    count: 0,
  }));

  for (const price of prices) {
    const rawIndex = Math.floor((price - minPrice) / step);
    const index = Math.min(Math.max(0, rawIndex), binCount - 1);
    bins[index].count += 1;
  }

  return bins;
};

export type PensionViewModeValue = 'full' | 'card' | 'map';
export type PensionRatingTierValue = 'high' | 'medium' | 'low' | 'unreviewed';

export const classifyPensionRatingTier = (pension: PensionDocRaw): PensionRatingTierValue => {
  const count =
    typeof pension.ratingCount === 'number' ? pension.ratingCount : (pension._count?.reviews ?? 0);
  const rating = typeof pension.ratingAverage === 'number' ? Number(pension.ratingAverage) : 0;

  if (count === 0 || rating === 0) {
    return 'unreviewed';
  }

  const confidenceInertia = 3;
  const priorMean = 3.5;
  const rAdj =
    (count / (count + confidenceInertia)) * rating +
    (confidenceInertia / (count + confidenceInertia)) * priorMean;

  const isVerified =
    pension.verificationStatus === 'OFFICIALLY_VERIFIED' ||
    pension.verificationStatus === 'COMMUNITY_VERIFIED';
  const hasWifi = typeof pension.internetIncluded === 'boolean' ? pension.internetIncluded : true;
  const hasStudyRoom = (pension.amenities || []).some(
    (item) =>
      (typeof item === 'string' ? item : (item as { slug?: string })?.slug) ===
      'sala-estudio-cowork',
  );
  const distance = pension.nearbyUniversities?.[0]?.distanceMeters;
  const hasProximity = typeof distance === 'number' && distance > 0 && distance <= 1200;

  const crs =
    rAdj +
    (isVerified ? 0.25 : 0) +
    (hasWifi ? 0.1 : 0) +
    (hasStudyRoom ? 0.15 : 0) +
    (hasProximity ? 0.15 : 0);

  if (count >= 3 && rating >= 4.2 && hasWifi && crs >= 4.25) {
    return 'high';
  }

  if ((count >= 1 && count <= 2 && rating >= 4.0) || (rating >= 3.0 && crs >= 3.2)) {
    return 'medium';
  }

  return 'low';
};

export const matchesRatingTier = (
  pension: PensionDocRaw,
  targetTier: PensionRatingTierValue,
): boolean => {
  const tier = classifyPensionRatingTier(pension);
  if (targetTier === 'low') {
    return tier === 'low' || tier === 'unreviewed';
  }
  return tier === targetTier;
};

export const formatPensionItem = (
  pension: PensionDocRaw,
  limitImages = 3,
  view: PensionViewModeValue = 'full',
): Record<string, unknown> => {
  const effectiveImageLimit = view === 'map' ? 1 : limitImages;
  const images = (pension.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, effectiveImageLimit)
    .map((img) => ({
      ...img,
      thumbnailUrl: resolvePensionThumbnailUrl(img.url, img.thumbnailUrl),
    }));

  const mappedAmenities = (pension.amenities || []).map((item: unknown) => {
    const slug = typeof item === 'string' ? item : ((item as { slug?: string })?.slug ?? '');
    const existingName =
      typeof item === 'object' && item !== null && 'name' in item
        ? String((item as { name: unknown }).name)
        : null;
    return {
      slug,
      name: existingName || (slug ? formatSlugAsTitle(slug) : ''),
    };
  });

  const activeRooms = (pension.rooms || []).filter((r) => !r.deletedAt);
  const availableRooms = activeRooms.filter((r) => r.isAvailable && r.isActive !== false);
  const availableRoomsCount = availableRooms.length;
  const availableRoomTypes = Array.from(
    new Set(
      availableRooms
        .map((r) => (r as { type?: string }).type)
        .filter((t): t is string => Boolean(t)),
    ),
  );
  const hasPrivateBathroomRoom = availableRooms.some((r) =>
    Boolean((r as { hasPrivateBathroom?: boolean }).hasPrivateBathroom),
  );
  const rooms =
    view === 'full'
      ? activeRooms
          .slice()
          .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
          .map((r) => ({
            ...r,
            name: r.title,
            priceMonthlyClp: r.monthlyPrice,
            isActive: r.isActive ?? true,
            bathType: r.hasPrivateBathroom ? 'PRIVATE' : 'SHARED',
          }))
      : [];

  const mappedUniversities = (pension.nearbyUniversities || []).map((u) => ({
    ...u,
    university: {
      id: u.universityId,
      name: u.name,
      shortName: u.shortName ?? null,
    },
  }));

  const firstNearby = mappedUniversities[0];
  const nearestUniversity = firstNearby
    ? {
        name: firstNearby.university.name,
        shortName: firstNearby.university.shortName ?? null,
        distanceMeters: firstNearby.distanceMeters,
      }
    : undefined;

  const amenitySlugs = mappedAmenities.map((a) => a.slug).filter(Boolean);
  const reviewsCount = pension._count?.reviews ?? pension.ratingCount ?? 0;
  const ratingTier = classifyPensionRatingTier({
    ...pension,
    ratingCount: reviewsCount,
  });
  const reliability = reviewsCount === 0 ? 'unreviewed' : reviewsCount >= 5 ? 'high' : 'low';

  return {
    ...pension,
    description: view === 'full' ? pension.description : '',
    isActive: Boolean(pension.isActive ?? true),
    ratingAverage: Number(pension.ratingAverage ?? 0),
    averageRating: Number(pension.ratingAverage ?? 0),
    ratingCount: Number(pension.ratingCount ?? reviewsCount),
    reviewsCount,
    images,
    amenities: view === 'map' ? [] : mappedAmenities,
    amenitySlugs,
    nearestUniversity,
    rooms,
    nearbyUniversities: view === 'full' ? mappedUniversities : [],
    availableRoomsCount,
    availableRoomTypes,
    hasPrivateBathroomRoom,
    ratingTier,
    reliability,
    _count: {
      rooms: activeRooms.length,
      reviews: reviewsCount,
      ...(pension._count?.proposals !== undefined ? { proposals: pension._count.proposals } : {}),
    },
  };
};

export const normalizeAmenitiesAndInternet = (
  amenitySlugs: readonly string[] | undefined,
  internetIncluded: boolean | undefined,
  existingAmenities?: readonly string[],
): { amenities?: string[]; internetIncluded?: boolean } => {
  const isCreateMode = existingAmenities === undefined;

  if (isCreateMode) {
    const resolvedInternet = internetIncluded ?? true;
    const filtered = (amenitySlugs ?? []).filter((s) => !INCLUDED_UTILITY_SLUGS.has(s));
    if (filtered.includes(WIFI_SLUG)) {
      return { amenities: filtered, internetIncluded: true };
    }
    if (resolvedInternet) {
      filtered.push(WIFI_SLUG);
    }
    return { amenities: filtered, internetIncluded: resolvedInternet };
  }

  let updatedAmenities =
    amenitySlugs !== undefined
      ? amenitySlugs.filter((s) => !INCLUDED_UTILITY_SLUGS.has(s))
      : undefined;
  let updatedInternet = internetIncluded;

  if (updatedInternet === true) {
    const base = updatedAmenities ?? [...existingAmenities];
    if (!base.includes(WIFI_SLUG)) {
      updatedAmenities = [...base, WIFI_SLUG];
    }
  } else if (updatedInternet === false) {
    const base = updatedAmenities ?? [...existingAmenities];
    if (base.includes(WIFI_SLUG)) {
      updatedAmenities = base.filter((s) => s !== WIFI_SLUG);
    }
  } else if (updatedAmenities !== undefined) {
    updatedInternet = updatedAmenities.includes(WIFI_SLUG);
  }

  return { amenities: updatedAmenities, internetIncluded: updatedInternet };
};

export const mapImagesInput = (images: readonly string[]): EmbeddedPensionImageRaw[] => {
  const now = new Date();
  return images.map((url, idx) => ({
    id: crypto.randomUUID(),
    url,
    thumbnailUrl: resolvePensionThumbnailUrl(url),
    caption: null,
    isFeatured: idx === 0,
    sortOrder: idx,
    createdAt: now,
  }));
};

export const buildNearbyUniversityEntry = (
  uni: {
    id: string;
    name: string;
    shortName: string | null;
    latitude: number | null;
    longitude: number | null;
  },
  pensionLat: number | undefined,
  pensionLng: number | undefined,
  providedDistanceMeters: number | undefined,
): EmbeddedNearbyUniversityRaw => {
  let distMeters = providedDistanceMeters;
  if (
    distMeters === undefined &&
    typeof uni.latitude === 'number' &&
    typeof uni.longitude === 'number' &&
    typeof pensionLat === 'number' &&
    typeof pensionLng === 'number'
  ) {
    distMeters = Math.round(
      calculateHaversineDistanceKm(pensionLat, pensionLng, uni.latitude, uni.longitude) * 1000,
    );
  }

  return {
    universityId: uni.id,
    name: uni.name,
    shortName: uni.shortName ?? null,
    distanceMeters: distMeters ?? 0,
    walkingMinutes: typeof distMeters === 'number' ? calculateWalkingMinutes(distMeters) : null,
    transitMinutes: typeof distMeters === 'number' ? calculateTransitMinutes(distMeters) : null,
  };
};

export const buildPaginatedPensions = <T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
  nearbyCityCounts: PaginatedPensions<T>['nearbyCityCounts'],
): PaginatedPensions<T> => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: (page - 1) * limit + limit < total,
    },
    nearbyCityCounts,
    total,
    page,
    limit,
    totalPages,
  };
};
