import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ProposalStatus, Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePensionDto } from './dto/create-pension.dto.js';
import type { FilterPensionsDto } from './dto/filter-pensions.dto.js';
import type { UpdatePensionDto } from './dto/update-pension.dto.js';

export type PaginatedPensions<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  nearbyCityCounts: Array<{
    city: string;
    count: number;
    distanceKm?: number;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type PriceHistogramBin = {
  min: number;
  max: number;
  count: number;
};

export type PriceHistogram = {
  minPrice: number;
  maxPrice: number;
  currency: string;
  totalListings: number;
  bins: PriceHistogramBin[];
};

export const calculateHaversineDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

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

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

@Injectable()
export class PensionsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(filter: FilterPensionsDto): Prisma.PensionWhereInput {
    const where: Prisma.PensionWhereInput = {
      deletedAt: null,
      isActive: true,
    };

    if (filter.city) {
      where.city = { contains: filter.city, mode: 'insensitive' };
    }

    if (filter.neighborhood) {
      where.neighborhood = { contains: filter.neighborhood, mode: 'insensitive' };
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.baseMonthlyPrice = {};
      if (filter.minPrice !== undefined) {
        where.baseMonthlyPrice.gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        where.baseMonthlyPrice.lte = filter.maxPrice;
      }
    }

    if (filter.genderPreference) {
      where.genderPreference = filter.genderPreference;
    }

    if (filter.universityId) {
      where.nearbyUniversities = {
        some: { universityId: filter.universityId },
      };
    }

    if (filter.amenities && filter.amenities.length > 0) {
      where.amenities = {
        some: { slug: { in: filter.amenities } },
      };
    }

    if (filter.includesMeals) {
      where.amenities = {
        some: {
          ...(where.amenities?.some ? where.amenities.some : {}),
          OR: [
            {
              slug: {
                in: [
                  'comida-incluida',
                  'pension-completa',
                  'media-pension',
                  'desayuno-incluido',
                  'alimentacion-incluida',
                ],
              },
            },
            { slug: { contains: 'comida', mode: 'insensitive' } },
            { slug: { contains: 'pension', mode: 'insensitive' } },
            { slug: { contains: 'alimento', mode: 'insensitive' } },
            { slug: { contains: 'desayuno', mode: 'insensitive' } },
            { slug: { contains: 'almuerzo', mode: 'insensitive' } },
            { name: { contains: 'comida', mode: 'insensitive' } },
            { name: { contains: 'pensión', mode: 'insensitive' } },
            { name: { contains: 'alimentación', mode: 'insensitive' } },
            { name: { contains: 'desayuno', mode: 'insensitive' } },
            { name: { contains: 'almuerzo', mode: 'insensitive' } },
          ],
        },
      };
    }

    if (filter.roomType || filter.hasPrivateBathroom !== undefined || filter.minBeds) {
      where.rooms = {
        some: {
          deletedAt: null,
          isAvailable: true,
          ...(filter.roomType ? { type: filter.roomType } : {}),
          ...(filter.hasPrivateBathroom !== undefined
            ? { hasPrivateBathroom: filter.hasPrivateBathroom }
            : {}),
          ...(filter.minBeds ? { availableBeds: { gte: filter.minBeds } } : {}),
        },
      };
    }

    if (filter.search) {
      const searchTerms = [filter.search];
      if (/uchile/i.test(filter.search)) {
        searchTerms.push('Universidad de Chile');
      }
      if (/\b(uc|puc|pucch)\b/i.test(filter.search)) {
        searchTerms.push('Catolica');
      }
      if (/\b(usm|utfsm)\b/i.test(filter.search)) {
        searchTerms.push('Santa María');
      }

      where.OR = searchTerms.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { neighborhood: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        {
          nearbyUniversities: {
            some: {
              university: {
                OR: [
                  { name: { contains: term, mode: 'insensitive' } },
                  { shortName: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ]);
    }

    const hasBounds =
      filter.minLat !== undefined &&
      filter.maxLat !== undefined &&
      filter.minLng !== undefined &&
      filter.maxLng !== undefined;

    if (hasBounds) {
      where.latitude = { gte: filter.minLat, lte: filter.maxLat };
      where.longitude = { gte: filter.minLng, lte: filter.maxLng };
    }

    return where;
  }

  private calculateBins(
    prices: number[],
    minPrice: number,
    maxPrice: number,
    binCount: number = 28,
  ): PriceHistogramBin[] {
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
    const bins: PriceHistogramBin[] = Array.from({ length: binCount }, (_, i) => {
      const min = Math.round(minPrice + i * step);
      const max = i === binCount - 1 ? maxPrice : Math.round(minPrice + (i + 1) * step);
      return { min, max, count: 0 };
    });

    for (const price of prices) {
      const rawIndex = Math.floor((price - minPrice) / step);
      const index = Math.min(Math.max(0, rawIndex), binCount - 1);
      bins[index].count += 1;
    }

    return bins;
  }

  async findAll(filter: FilterPensionsDto): Promise<PaginatedPensions<unknown>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(50, filter.limit || 12));
    const skip = (page - 1) * limit;

    const where = this.buildWhere(filter);

    const hasBounds =
      filter.minLat !== undefined &&
      filter.maxLat !== undefined &&
      filter.minLng !== undefined &&
      filter.maxLng !== undefined;

    const hasGeo = filter.latitude !== undefined && filter.longitude !== undefined;

    if (hasGeo) {
      const userLat = filter.latitude as number;
      const userLng = filter.longitude as number;
      const radiusKm = Math.max(1, Math.min(100, filter.radiusKm || 30));

      const candidates = await this.prisma.pension.findMany({
        where,
        include: {
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
          amenities: {
            where: { deletedAt: null },
            take: 5,
          },
          nearbyUniversities: {
            include: {
              university: {
                select: { id: true, name: true, shortName: true },
              },
            },
            take: 2,
          },
          rooms: {
            where: { deletedAt: null, isAvailable: true },
            select: { availableBeds: true },
          },
          _count: {
            select: {
              rooms: true,
              reviews: true,
            },
          },
        },
      });

      const cityCountsMap = new Map<string, { count: number; minDistance: number }>();

      type ScoredPension = (typeof candidates)[0] & {
        distanceKm: number;
        relevanceScore: number;
      };

      const inRadiusItems: ScoredPension[] = [];

      for (const pension of candidates) {
        const distanceKm = calculateHaversineDistanceKm(
          userLat,
          userLng,
          pension.latitude,
          pension.longitude,
        );

        if (distanceKm <= Math.max(radiusKm, 60)) {
          const currentCity = cityCountsMap.get(pension.city) || {
            count: 0,
            minDistance: distanceKm,
          };
          currentCity.count += 1;
          if (distanceKm < currentCity.minDistance) {
            currentCity.minDistance = distanceKm;
          }
          cityCountsMap.set(pension.city, currentCity);
        }

        if (hasBounds || distanceKm <= radiusKm) {
          const totalAvailableBeds = pension.rooms.reduce(
            (acc, r) => acc + (r.availableBeds || 0),
            0,
          );
          const hasUtilities = pension.amenities.some(
            (a) =>
              a.category === 'BASIC_UTILITY' ||
              a.slug.includes('wifi') ||
              a.slug.includes('luz') ||
              a.slug.includes('agua'),
          );

          const relevanceScore = calculateRelevanceScore(
            distanceKm,
            radiusKm,
            Number(pension.ratingAverage),
            pension.ratingCount,
            pension.verificationStatus,
            totalAvailableBeds,
            hasUtilities,
          );

          inRadiusItems.push({
            ...pension,
            distanceKm,
            relevanceScore,
          });
        }
      }

      const sortBy = filter.sortBy || 'relevance';
      inRadiusItems.sort((a, b) => {
        if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
        if (sortBy === 'rating') return Number(b.ratingAverage) - Number(a.ratingAverage);
        if (sortBy === 'price_asc') return Number(a.baseMonthlyPrice) - Number(b.baseMonthlyPrice);
        if (sortBy === 'price_desc') return Number(b.baseMonthlyPrice) - Number(a.baseMonthlyPrice);
        return b.relevanceScore - a.relevanceScore;
      });

      const total = inRadiusItems.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const items = inRadiusItems.slice(skip, skip + limit);
      const hasMore = skip + limit < total;

      const nearbyCityCounts = Array.from(cityCountsMap.entries())
        .map(([city, data]) => ({
          city,
          count: data.count,
          distanceKm: data.minDistance,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore,
        },
        nearbyCityCounts,
        total,
        page,
        limit,
        totalPages,
      };
    }

    let orderBy: Prisma.PensionOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sortBy === 'rating') {
      orderBy = { ratingAverage: 'desc' };
    } else if (filter.sortBy === 'price_asc') {
      orderBy = { baseMonthlyPrice: 'asc' };
    } else if (filter.sortBy === 'price_desc') {
      orderBy = { baseMonthlyPrice: 'desc' };
    }

    const [items, total, cityGroups] = await Promise.all([
      this.prisma.pension.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
          amenities: {
            where: { deletedAt: null },
            take: 5,
          },
          nearbyUniversities: {
            include: {
              university: {
                select: { id: true, name: true, shortName: true },
              },
            },
            take: 2,
          },
          _count: {
            select: {
              rooms: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.pension.count({ where }),
      this.prisma.pension.groupBy({
        by: ['city'],
        where: { deletedAt: null, isActive: true },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = skip + limit < total;
    const nearbyCityCounts = cityGroups.map((g) => ({
      city: g.city,
      count: g._count.id,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore,
      },
      nearbyCityCounts,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getPriceHistogram(filter: FilterPensionsDto): Promise<PriceHistogram> {
    const where = this.buildWhere(filter);
    const hasGeo = filter.latitude !== undefined && filter.longitude !== undefined;

    if (hasGeo) {
      const userLat = filter.latitude as number;
      const userLng = filter.longitude as number;
      const radiusKm = Math.max(1, Math.min(100, filter.radiusKm || 30));
      const hasBounds =
        filter.minLat !== undefined &&
        filter.maxLat !== undefined &&
        filter.minLng !== undefined &&
        filter.maxLng !== undefined;

      const candidates = await this.prisma.pension.findMany({
        where,
        select: {
          latitude: true,
          longitude: true,
          baseMonthlyPrice: true,
        },
      });

      const prices: number[] = [];
      for (const p of candidates) {
        const distanceKm = calculateHaversineDistanceKm(userLat, userLng, p.latitude, p.longitude);
        if (hasBounds || distanceKm <= radiusKm) {
          prices.push(Number(p.baseMonthlyPrice));
        }
      }

      if (prices.length === 0) {
        return {
          minPrice: 100000,
          maxPrice: 600000,
          currency: 'CLP',
          totalListings: 0,
          bins: [],
        };
      }

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const bins = this.calculateBins(prices, minPrice, maxPrice, 28);

      return {
        minPrice,
        maxPrice,
        currency: 'CLP',
        totalListings: prices.length,
        bins,
      };
    }

    const aggregate = await this.prisma.pension.aggregate({
      where,
      _min: { baseMonthlyPrice: true },
      _max: { baseMonthlyPrice: true },
      _count: { id: true },
    });

    const totalListings = aggregate._count.id;
    if (
      totalListings === 0 ||
      aggregate._min.baseMonthlyPrice === null ||
      aggregate._max.baseMonthlyPrice === null
    ) {
      return {
        minPrice: 100000,
        maxPrice: 600000,
        currency: 'CLP',
        totalListings: 0,
        bins: [],
      };
    }

    const minPrice = Number(aggregate._min.baseMonthlyPrice);
    const maxPrice = Number(aggregate._max.baseMonthlyPrice);

    const listings = await this.prisma.pension.findMany({
      where,
      select: { baseMonthlyPrice: true },
    });

    const prices = listings.map((l) => Number(l.baseMonthlyPrice));
    const bins = this.calculateBins(prices, minPrice, maxPrice, 28);

    return {
      minPrice,
      maxPrice,
      currency: 'CLP',
      totalListings,
      bins,
    };
  }

  async findMine(userId: string): Promise<unknown> {
    return this.prisma.pension.findMany({
      where: {
        landlordId: userId,
        deletedAt: null,
      },
      include: {
        rooms: {
          where: { deletedAt: null },
          select: {
            id: true,
            roomNumber: true,
            title: true,
            type: true,
            monthlyPrice: true,
            deposit: true,
            hasPrivateBathroom: true,
            totalBeds: true,
            availableBeds: true,
            isAvailable: true,
          },
        },
        _count: {
          select: {
            reviews: { where: { deletedAt: null } },
            proposals: { where: { status: ProposalStatus.PENDING } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlugOrId(idOrSlug: string, user?: SanitizedUser | null): Promise<unknown> {
    const pension = await this.prisma.pension.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        images: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          where: { deletedAt: null },
        },
        rooms: {
          where: { deletedAt: null },
          orderBy: { monthlyPrice: 'asc' },
        },
        nearbyUniversities: {
          include: {
            university: true,
          },
        },
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${idOrSlug}' not found`);
    }

    if (!user) {
      return {
        ...pension,
        address: `${pension.neighborhood}, ${pension.city}`,
        landlord: pension.landlord
          ? {
              id: pension.landlord.id,
              firstName: pension.landlord.firstName,
              avatarUrl: pension.landlord.avatarUrl,
            }
          : null,
        rooms: [],
      };
    }

    return pension;
  }

  async create(dto: CreatePensionDto, landlord: SanitizedUser): Promise<unknown> {
    const rawSlug = slugify(dto.title);
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${rawSlug}-${uniqueSuffix}`;

    const { amenitySlugs, nearbyUniversityId, distanceMeters, ...pensionData } = dto;

    return this.prisma.pension.create({
      data: {
        ...pensionData,
        slug,
        landlordId: landlord.id,
        submittedById: landlord.id,
        amenities:
          amenitySlugs && amenitySlugs.length > 0
            ? {
                connect: amenitySlugs.map((s) => ({ slug: s })),
              }
            : undefined,
        nearbyUniversities: nearbyUniversityId
          ? {
              create: {
                universityId: nearbyUniversityId,
                distanceMeters: distanceMeters || 1000,
                walkingMinutes: Math.round((distanceMeters || 1000) / 80),
              },
            }
          : undefined,
      },
      include: {
        amenities: true,
        nearbyUniversities: true,
      },
    });
  }

  async update(id: string, dto: UpdatePensionDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only update your own pensions');
    }

    const { amenitySlugs, nearbyUniversityId, distanceMeters, ...pensionData } = dto;

    return this.prisma.pension.update({
      where: { id },
      data: {
        ...pensionData,
        amenities: amenitySlugs
          ? {
              set: amenitySlugs.map((s) => ({ slug: s })),
            }
          : undefined,
      },
      include: {
        amenities: true,
        images: true,
      },
    });
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const pension = await this.prisma.pension.findUnique({
      where: { id, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only delete your own pensions');
    }

    await this.prisma.pension.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }
}
