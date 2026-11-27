import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ProposalStatus, Role } from '@prisma/sql-client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { calculateBoundingBox, calculateHaversineDistanceKm } from '../common/utils/geo.util.js';
import { isValidObjectId, slugify } from '../common/utils/string.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import { UniversitiesCacheService } from '../universities/universities-cache.service.js';
import { AMENITY_CATALOG_ITEMS } from './constants/amenities-catalog.js';
import { findCityCenter } from './constants/city-centers.js';
import type { CreatePensionDto } from './dto/create-pension.dto.js';
import type { FilterPensionsDto } from './dto/filter-pensions.dto.js';
import type { PensionAmenityCatalogItemDto } from './dto/pension-response.dto.js';
import type { UpdatePensionDto } from './dto/update-pension.dto.js';
import type {
  CitySummaryItem,
  EmbeddedNearbyUniversityRaw,
  PaginatedPensions,
  PensionDocRaw,
  PriceHistogram,
  PriceHistogramBin,
} from './types/pension-raw.types.js';
import {
  buildNearbyUniversityEntry,
  buildPaginatedPensions,
  calculatePriceBins,
  calculateRelevanceScore,
  formatPensionItem,
  MEAL_AMENITY_SLUGS,
  mapImagesInput,
  matchesRatingTier,
  normalizeAmenitiesAndInternet,
} from './utils/pension-helpers.js';

export type { CitySummaryItem, PaginatedPensions, PriceHistogram, PriceHistogramBin };
export { calculateHaversineDistanceKm, calculateRelevanceScore };

@Injectable()
export class PensionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sqlPrisma: SqlPrismaService,
    @Optional() private readonly universitiesCache?: UniversitiesCacheService,
  ) {}

  private hasBounds(filter: FilterPensionsDto): boolean {
    return (
      filter.minLat !== undefined &&
      filter.maxLat !== undefined &&
      filter.minLng !== undefined &&
      filter.maxLng !== undefined
    );
  }

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
      where.baseMonthlyPrice = {
        ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
        ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
      };
    }

    if (filter.genderPreference) {
      where.genderPreference = filter.genderPreference;
    }

    if (filter.universityId) {
      where.nearbyUniversities = { some: { universityId: filter.universityId } };
    }

    const hasAmenities = Boolean(filter.amenities && filter.amenities.length > 0);
    if (hasAmenities && filter.includesMeals) {
      where.AND = [
        { amenities: { hasEvery: filter.amenities } },
        { amenities: { hasSome: [...MEAL_AMENITY_SLUGS] } },
      ];
    } else if (hasAmenities) {
      where.amenities = { hasEvery: filter.amenities };
    } else if (filter.includesMeals) {
      where.amenities = { hasSome: [...MEAL_AMENITY_SLUGS] };
    }

    if (
      filter.roomType ||
      filter.hasPrivateBathroom !== undefined ||
      filter.minBeds ||
      filter.onlyAvailable
    ) {
      where.rooms = {
        some: {
          deletedAt: null,
          isActive: true,
          isAvailable: true,
          ...(filter.roomType ? { type: filter.roomType } : {}),
          ...(filter.hasPrivateBathroom !== undefined
            ? { hasPrivateBathroom: filter.hasPrivateBathroom }
            : {}),
          ...(filter.minBeds ? { availableBeds: { gte: filter.minBeds } } : {}),
        },
      };
    }

    if (filter.internetIncluded !== undefined) {
      where.internetIncluded = filter.internetIncluded;
    }

    if (filter.petsAllowed !== undefined) {
      where.petsAllowed = filter.petsAllowed;
    }

    if (filter.guestsAllowed !== undefined) {
      where.guestsAllowed = filter.guestsAllowed;
    }

    if (filter.smokingAllowed !== undefined) {
      where.smokingAllowed = filter.smokingAllowed;
    }

    if (filter.waterIncluded !== undefined) {
      where.waterIncluded = filter.waterIncluded;
    }

    if (filter.electricityIncluded !== undefined) {
      where.electricityIncluded = filter.electricityIncluded;
    }

    if (filter.gasIncluded !== undefined) {
      where.gasIncluded = filter.gasIncluded;
    }

    if (filter.noCurfew === true) {
      where.curfewTime = null;
    }

    if (filter.search) {
      const term = filter.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { neighborhood: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        {
          nearbyUniversities: {
            some: {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { shortName: { contains: term, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    if (this.hasBounds(filter)) {
      where.latitude = { gte: filter.minLat, lte: filter.maxLat };
      where.longitude = { gte: filter.minLng, lte: filter.maxLng };
    }

    return where;
  }

  async findAll(filter: FilterPensionsDto): Promise<PaginatedPensions<unknown>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(50, filter.limit || 12));
    const skip = (page - 1) * limit;
    const view = filter.view ?? 'full';
    const imageLimit = view === 'map' ? 1 : 3;
    const where = this.buildWhere(filter);
    const hasBounds = this.hasBounds(filter);
    const hasGeo = filter.latitude !== undefined && filter.longitude !== undefined;

    if (hasGeo) {
      const userLat = filter.latitude as number;
      const userLng = filter.longitude as number;
      const radiusKm = Math.max(1, Math.min(100, filter.radiusKm || 30));
      const cityRadiusKm = Math.max(radiusKm, 60);

      if (!hasBounds) {
        const bbox = calculateBoundingBox(userLat, userLng, cityRadiusKm);
        where.latitude = { gte: bbox.minLat, lte: bbox.maxLat };
        where.longitude = { gte: bbox.minLng, lte: bbox.maxLng };
      }

      const rawCandidates = await this.prisma.pension.findMany({
        where,
        include: { _count: { select: { reviews: { where: { deletedAt: null } } } } },
      });

      const cityCountsMap = new Map<string, { count: number; minDistance: number }>();
      type CandidateEntry = {
        pension: PensionDocRaw;
        distanceKm: number;
        relevanceScore: number;
      };
      const inRadiusCandidates: CandidateEntry[] = [];

      for (const raw of rawCandidates) {
        const pension = raw as unknown as PensionDocRaw;
        const distanceKm = calculateHaversineDistanceKm(
          userLat,
          userLng,
          pension.latitude,
          pension.longitude,
        );

        if (distanceKm <= cityRadiusKm) {
          const currentCity = cityCountsMap.get(pension.city) ?? {
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
          if (filter.ratingTier && !matchesRatingTier(pension, filter.ratingTier)) {
            continue;
          }

          const totalAvailableBeds = (pension.rooms || []).reduce(
            (acc, r) => acc + (r.availableBeds || 0),
            0,
          );
          const hasUtilities = Boolean(
            pension.waterIncluded ||
              pension.electricityIncluded ||
              pension.gasIncluded ||
              pension.internetIncluded,
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

          inRadiusCandidates.push({ pension, distanceKm, relevanceScore });
        }
      }

      const sortBy = filter.sortBy || 'relevance';
      inRadiusCandidates.sort((a, b) => {
        if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
        if (sortBy === 'rating') {
          return Number(b.pension.ratingAverage) - Number(a.pension.ratingAverage);
        }
        if (sortBy === 'price_asc') {
          return Number(a.pension.baseMonthlyPrice) - Number(b.pension.baseMonthlyPrice);
        }
        if (sortBy === 'price_desc') {
          return Number(b.pension.baseMonthlyPrice) - Number(a.pension.baseMonthlyPrice);
        }
        return b.relevanceScore - a.relevanceScore;
      });

      const pageItems = inRadiusCandidates.slice(skip, skip + limit).map((c) => ({
        ...formatPensionItem(c.pension, imageLimit, view),
        distanceKm: c.distanceKm,
        relevanceScore: c.relevanceScore,
      }));

      const nearbyCityCounts = Array.from(cityCountsMap.entries())
        .map(([city, data]) => ({
          city,
          count: data.count,
          distanceKm: data.minDistance,
        }))
        .sort((a, b) => b.count - a.count);

      return buildPaginatedPensions(
        pageItems,
        page,
        limit,
        inRadiusCandidates.length,
        nearbyCityCounts,
      );
    }

    let orderBy: Prisma.PensionOrderByWithRelationInput = { createdAt: 'desc' };
    if (filter.sortBy === 'rating') orderBy = { ratingAverage: 'desc' };
    else if (filter.sortBy === 'price_asc') orderBy = { baseMonthlyPrice: 'asc' };
    else if (filter.sortBy === 'price_desc') orderBy = { baseMonthlyPrice: 'desc' };

    if (filter.ratingTier) {
      const targetTier = filter.ratingTier;
      const [allCandidates, cityGroups] = await Promise.all([
        this.prisma.pension.findMany({
          where,
          orderBy,
          include: { _count: { select: { reviews: { where: { deletedAt: null } } } } },
        }),
        this.prisma.pension.groupBy({
          by: ['city'],
          where: { deletedAt: null, isActive: true },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),
      ]);

      const filteredCandidates = allCandidates.filter((raw) =>
        matchesRatingTier(raw as unknown as PensionDocRaw, targetTier),
      );
      const items = filteredCandidates
        .slice(skip, skip + limit)
        .map((item) => formatPensionItem(item as unknown as PensionDocRaw, imageLimit, view));
      const nearbyCityCounts = cityGroups.map((g) => ({
        city: g.city,
        count: g._count.id,
      }));

      return buildPaginatedPensions(
        items,
        page,
        limit,
        filteredCandidates.length,
        nearbyCityCounts,
      );
    }

    const [rawItems, total, cityGroups] = await Promise.all([
      this.prisma.pension.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: { _count: { select: { reviews: { where: { deletedAt: null } } } } },
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

    const items = rawItems.map((item) =>
      formatPensionItem(item as unknown as PensionDocRaw, imageLimit, view),
    );
    const nearbyCityCounts = cityGroups.map((g) => ({
      city: g.city,
      count: g._count.id,
    }));

    return buildPaginatedPensions(items, page, limit, total, nearbyCityCounts);
  }

  async getPriceHistogram(filter: FilterPensionsDto): Promise<PriceHistogram> {
    const where: Prisma.PensionWhereInput = {
      deletedAt: null,
      isActive: true,
    };

    if (filter.city) {
      where.city = { contains: filter.city, mode: 'insensitive' };
    }

    const hasGeo = filter.latitude !== undefined && filter.longitude !== undefined;
    const hasBounds = this.hasBounds(filter);

    if (hasBounds) {
      where.latitude = { gte: filter.minLat, lte: filter.maxLat };
      where.longitude = { gte: filter.minLng, lte: filter.maxLng };
    }

    if (hasGeo) {
      const userLat = filter.latitude as number;
      const userLng = filter.longitude as number;
      const radiusKm = Math.max(1, Math.min(100, filter.radiusKm || 30));

      if (!hasBounds) {
        const bbox = calculateBoundingBox(userLat, userLng, radiusKm);
        where.latitude = { gte: bbox.minLat, lte: bbox.maxLat };
        where.longitude = { gte: bbox.minLng, lte: bbox.maxLng };
      }

      const candidates = await this.prisma.pension.findMany({
        where,
        select: { latitude: true, longitude: true, baseMonthlyPrice: true },
      });

      const prices: number[] = [];
      let minPrice = Infinity;
      let maxPrice = -Infinity;

      for (const p of candidates) {
        const distanceKm = calculateHaversineDistanceKm(userLat, userLng, p.latitude, p.longitude);
        if (hasBounds || distanceKm <= radiusKm) {
          const price = Number(p.baseMonthlyPrice);
          prices.push(price);
          if (price < minPrice) minPrice = price;
          if (price > maxPrice) maxPrice = price;
        }
      }

      if (prices.length === 0) {
        return { minPrice: null, maxPrice: null, currency: 'CLP', totalListings: 0, bins: [] };
      }

      return {
        minPrice,
        maxPrice,
        currency: 'CLP',
        totalListings: prices.length,
        bins: calculatePriceBins(prices, minPrice, maxPrice, 28),
      };
    }

    const listings = await this.prisma.pension.findMany({
      where,
      select: { baseMonthlyPrice: true },
    });

    if (listings.length === 0) {
      return { minPrice: null, maxPrice: null, currency: 'CLP', totalListings: 0, bins: [] };
    }

    const prices: number[] = [];
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const listing of listings) {
      const price = Number(listing.baseMonthlyPrice);
      prices.push(price);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }

    return {
      minPrice,
      maxPrice,
      currency: 'CLP',
      totalListings: prices.length,
      bins: calculatePriceBins(prices, minPrice, maxPrice, 28),
    };
  }

  async findMine(userId: string): Promise<unknown> {
    const pensions = await this.prisma.pension.findMany({
      where: { landlordId: userId, deletedAt: null },
      include: {
        _count: {
          select: {
            reviews: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pensionIds = pensions.map((p) => p.id);
    const pendingProposalsByPension = new Map<string, number>();

    if (pensionIds.length > 0) {
      const proposalGroups = await this.sqlPrisma.pensionProposal.groupBy({
        by: ['pensionId'],
        where: {
          pensionId: { in: pensionIds },
          status: ProposalStatus.PENDING,
        },
        _count: { id: true },
      });
      for (const group of proposalGroups) {
        pendingProposalsByPension.set(group.pensionId, group._count.id);
      }
    }

    return pensions.map((p) => {
      const doc = p as unknown as PensionDocRaw;
      const activeRooms = (doc.rooms || []).filter((r) => !r.deletedAt);
      const pendingProposalsCount = pendingProposalsByPension.get(doc.id) ?? 0;
      const availableRoomsCount = activeRooms.filter(
        (r) => r.isAvailable && r.isActive !== false,
      ).length;
      return {
        ...doc,
        pendingProposalsCount,
        availableRoomsCount,
        rooms: activeRooms.map((r) => ({
          id: r.id,
          roomNumber: r.roomNumber ?? null,
          title: r.title,
          type: r.type,
          monthlyPrice: r.monthlyPrice,
          deposit: r.deposit ?? null,
          hasPrivateBathroom: r.hasPrivateBathroom,
          totalBeds: r.totalBeds,
          availableBeds: r.availableBeds,
          isAvailable: r.isAvailable,
          isActive: r.isActive ?? true,
          images: r.images ?? [],
        })),
      };
    });
  }

  async findBySlugOrId(idOrSlug: string, _user?: SanitizedUser | null): Promise<unknown> {
    const pension = await this.prisma.pension.findFirst({
      where: isValidObjectId(idOrSlug)
        ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] }
        : { slug: idOrSlug },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${idOrSlug}' not found`);
    }

    const landlord = pension.landlordId
      ? await this.sqlPrisma.user.findUnique({
          where: { id: pension.landlordId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
          },
        })
      : null;

    return formatPensionItem(
      {
        ...(pension as unknown as PensionDocRaw),
        landlord,
      },
      100,
    );
  }

  async getAmenitiesCatalog(): Promise<PensionAmenityCatalogItemDto[]> {
    try {
      const dbAmenities = await this.sqlPrisma.amenity.findMany({
        where: { deletedAt: null },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });

      if (dbAmenities && dbAmenities.length > 0) {
        return dbAmenities.map((a) => ({
          slug: a.slug,
          name: a.name,
          category: a.category,
          iconKey: a.iconKey ?? null,
        }));
      }
    } catch {}

    return [...AMENITY_CATALOG_ITEMS];
  }

  private async resolveNearbyUniversities(
    nearbyUniversityId: string | undefined,
    latitude: number | undefined,
    longitude: number | undefined,
    city: string | undefined,
    distanceMeters: number | undefined,
  ): Promise<EmbeddedNearbyUniversityRaw[] | undefined> {
    if (nearbyUniversityId !== undefined) {
      const uni = await this.sqlPrisma.university.findUnique({
        where: { id: nearbyUniversityId },
        select: { id: true, name: true, shortName: true, latitude: true, longitude: true },
      });
      if (!uni) {
        return undefined;
      }
      return [buildNearbyUniversityEntry(uni, latitude, longitude, distanceMeters)];
    }

    if (this.universitiesCache && typeof latitude === 'number' && typeof longitude === 'number') {
      return this.universitiesCache
        .findNearby(latitude, longitude, { city, maxDistanceMeters: 5000, limit: 3 })
        .map((u) => ({
          universityId: u.universityId,
          name: u.name,
          shortName: u.shortName,
          distanceMeters: u.distanceMeters,
          walkingMinutes: u.walkingMinutes,
          transitMinutes: u.transitMinutes,
        }));
    }

    return undefined;
  }

  async create(dto: CreatePensionDto, landlord: SanitizedUser): Promise<unknown> {
    const slug = `${slugify(dto.title)}-${Math.random().toString(36).substring(2, 7)}`;
    const { amenitySlugs, nearbyUniversityId, distanceMeters, images, ...pensionData } = dto;
    const { amenities, internetIncluded } = normalizeAmenitiesAndInternet(
      amenitySlugs,
      pensionData.internetIncluded,
    );

    const nearbyUniversitiesData =
      (await this.resolveNearbyUniversities(
        nearbyUniversityId,
        dto.latitude,
        dto.longitude,
        dto.city,
        distanceMeters,
      )) ?? [];

    const location =
      typeof dto.latitude === 'number' && typeof dto.longitude === 'number'
        ? { type: 'Point', coordinates: [dto.longitude, dto.latitude] }
        : undefined;

    const created = await this.prisma.pension.create({
      data: {
        ...pensionData,
        internetIncluded: internetIncluded ?? true,
        slug,
        landlordId: landlord.id,
        submittedById: landlord.id,
        location,
        amenities: amenities ?? [],
        nearbyUniversities: nearbyUniversitiesData,
        rooms: [],
        images: mapImagesInput(images ?? []),
      },
    });

    return formatPensionItem(created as unknown as PensionDocRaw, 100);
  }

  async update(id: string, dto: UpdatePensionDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({ where: { id } });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only update your own pensions');
    }

    const { amenitySlugs, nearbyUniversityId, distanceMeters, images, ...pensionData } = dto;
    const updateData: Prisma.PensionUpdateInput = { ...pensionData };

    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      updateData.location = { type: 'Point', coordinates: [dto.longitude, dto.latitude] };
    }

    const { amenities, internetIncluded } = normalizeAmenitiesAndInternet(
      amenitySlugs,
      pensionData.internetIncluded,
      pension.amenities || [],
    );

    if (amenities !== undefined) {
      updateData.amenities = amenities;
    }
    if (internetIncluded !== undefined) {
      updateData.internetIncluded = internetIncluded;
    }
    if (images !== undefined) {
      updateData.images = mapImagesInput(images);
    }

    if (
      nearbyUniversityId !== undefined ||
      dto.latitude !== undefined ||
      dto.longitude !== undefined
    ) {
      const resolved = await this.resolveNearbyUniversities(
        nearbyUniversityId,
        dto.latitude ?? pension.latitude,
        dto.longitude ?? pension.longitude,
        dto.city ?? pension.city,
        distanceMeters,
      );
      if (resolved !== undefined) {
        updateData.nearbyUniversities = resolved;
      }
    }

    const updated = await this.prisma.pension.update({
      where: { id: pension.id },
      data: updateData,
    });

    return formatPensionItem(updated as unknown as PensionDocRaw, 100);
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const pension = await this.prisma.pension.findUnique({ where: { id } });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only delete your own pensions');
    }

    await this.prisma.pension.update({
      where: { id: pension.id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }

  async getCitiesSummary(): Promise<CitySummaryItem[]> {
    const cachedUnis = this.universitiesCache?.getAll();

    const [pensionGroups, pensions, dbUniversities] = await Promise.all([
      this.prisma.pension.groupBy({
        by: ['city'],
        where: { deletedAt: null, isActive: true },
        _count: { id: true },
      }),
      this.prisma.pension.findMany({
        where: { deletedAt: null, isActive: true },
        select: { city: true, latitude: true, longitude: true },
      }),
      cachedUnis && cachedUnis.length > 0
        ? Promise.resolve(cachedUnis)
        : this.sqlPrisma.university.findMany({
            where: { deletedAt: null },
            select: { city: true, latitude: true, longitude: true },
          }),
    ]);

    const countMap = new Map<string, number>();
    for (const group of pensionGroups) {
      if (group.city) {
        countMap.set(group.city.trim().toLowerCase(), group._count.id);
      }
    }

    const cityDataMap = new Map<
      string,
      { name: string; latitude: number; longitude: number; imageUrl?: string | null }
    >();

    for (const uni of dbUniversities) {
      if (uni.city) {
        const trimmed = uni.city.trim();
        const key = trimmed.toLowerCase();
        if (!cityDataMap.has(key)) {
          cityDataMap.set(key, {
            name: trimmed,
            latitude: uni.latitude,
            longitude: uni.longitude,
          });
        }
      }
    }

    for (const pension of pensions) {
      if (pension.city) {
        const trimmed = pension.city.trim();
        cityDataMap.set(trimmed.toLowerCase(), {
          name: trimmed,
          latitude: pension.latitude,
          longitude: pension.longitude,
        });
      }
    }

    const result: CitySummaryItem[] = [];
    for (const [key, data] of cityDataMap.entries()) {
      const center = findCityCenter(data.name);
      const item: CitySummaryItem = {
        id: slugify(data.name),
        name: data.name,
        pensionsCount: countMap.get(key) ?? 0,
        latitude: center?.latitude ?? data.latitude,
        longitude: center?.longitude ?? data.longitude,
      };
      if (data.imageUrl) {
        item.imageUrl = data.imageUrl;
      }
      result.push(item);
    }

    return result.sort((a, b) => b.pensionsCount - a.pensionsCount || a.name.localeCompare(b.name));
  }
}
