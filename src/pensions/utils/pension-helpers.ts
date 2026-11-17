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

export const formatPensionItem = (
  pension: PensionDocRaw,
  limitImages = 3,
): Record<string, unknown> => {
  const images = (pension.images || [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, limitImages);

  const amenities = (pension.amenities || []).map((item: unknown) => {
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
  const rooms = activeRooms
    .slice()
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
    .map((r) => ({
      ...r,
      name: r.title,
      priceMonthlyClp: r.monthlyPrice,
      isActive: r.isActive ?? true,
      bathType: r.hasPrivateBathroom ? 'PRIVATE' : 'SHARED',
    }));

  const nearbyUniversities = (pension.nearbyUniversities || []).map((u) => ({
    ...u,
    university: {
      id: u.universityId,
      name: u.name,
      shortName: u.shortName ?? null,
    },
  }));

  const firstNearby = nearbyUniversities[0];
  const nearestUniversity = firstNearby
    ? {
        name: firstNearby.university.name,
        shortName: firstNearby.university.shortName ?? null,
        distanceMeters: firstNearby.distanceMeters,
      }
    : undefined;

  const amenitySlugs = amenities.map((a) => a.slug).filter(Boolean);
  const reviewsCount = pension._count?.reviews ?? pension.ratingCount ?? 0;

  return {
    ...pension,
    isActive: Boolean(pension.isActive ?? true),
    ratingAverage: Number(pension.ratingAverage ?? 0),
    averageRating: Number(pension.ratingAverage ?? 0),
    ratingCount: Number(pension.ratingCount ?? reviewsCount),
    reviewsCount,
    images,
    amenities,
    amenitySlugs,
    nearestUniversity,
    rooms,
    nearbyUniversities,
    _count: {
      rooms: activeRooms.length,
      reviews: reviewsCount,
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
    thumbnailUrl: url,
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
