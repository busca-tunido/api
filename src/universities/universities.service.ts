import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CampusAreaResponseDto } from './dto/campus-area.dto.js';
import type { CreateUniversityDto } from './dto/create-university.dto.js';
import type { UniversityResponseDto } from './dto/university-response.dto.js';
import type { UpdateUniversityDto } from './dto/update-university.dto.js';
import { UniversitiesCacheService } from './universities-cache.service.js';

export type UniversityDomainMatch = {
  id: string;
  name: string;
  shortName: string | null;
  city: string;
  address: string;
};

const UNIVERSITY_PUBLIC_SELECT = {
  id: true,
  name: true,
  shortName: true,
  emailDomains: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  campuses: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      students: true,
    },
  },
} satisfies Prisma.UniversitySelect;

const NEARBY_COUNTS_TTL_MS = 60_000;

@Injectable()
export class UniversitiesService {
  private nearbyCountsCache: { map: Map<string, number>; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cache?: UniversitiesCacheService,
  ) {}

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.university.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`University '${id}' not found`);
    }
  }

  private async getNearbyPensionCountMap(): Promise<Map<string, number>> {
    const now = Date.now();
    if (this.nearbyCountsCache && now < this.nearbyCountsCache.expiresAt) {
      return this.nearbyCountsCache.map;
    }

    const activePensions = await this.prisma.pension.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        nearbyUniversities: true,
      },
    });

    const countMap = new Map<string, number>();
    for (const pension of activePensions ?? []) {
      if (Array.isArray(pension?.nearbyUniversities)) {
        for (const nu of pension.nearbyUniversities) {
          if (nu?.universityId) {
            countMap.set(nu.universityId, (countMap.get(nu.universityId) ?? 0) + 1);
          }
        }
      }
    }

    this.nearbyCountsCache = {
      map: countMap,
      expiresAt: now + NEARBY_COUNTS_TTL_MS,
    };

    return countMap;
  }

  async findByEmailDomain(email: string): Promise<UniversityDomainMatch | null> {
    const parts = email.toLowerCase().trim().split('@');
    const fullDomain = parts.length === 2 ? parts[1] : '';
    if (!fullDomain) {
      return null;
    }

    const candidateDomains: string[] = [fullDomain];
    const domainSegments = fullDomain.split('.');
    for (let i = 1; i < domainSegments.length - 1; i++) {
      candidateDomains.push(domainSegments.slice(i).join('.'));
    }

    const cachedMatch = this.cache?.findByEmailDomains?.(candidateDomains);
    if (cachedMatch !== undefined) {
      return cachedMatch;
    }

    return this.prisma.university.findFirst({
      where: {
        deletedAt: null,
        emailDomains: { hasSome: candidateDomains },
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        city: true,
        address: true,
      },
    });
  }

  async findAll(city?: string, includeCampuses = true): Promise<UniversityResponseDto[]> {
    const where: Prisma.UniversityWhereInput = {
      deletedAt: null,
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    };

    const select = includeCampuses
      ? UNIVERSITY_PUBLIC_SELECT
      : {
          ...UNIVERSITY_PUBLIC_SELECT,
          campuses: false,
        };

    const [universities, countMap] = await Promise.all([
      this.prisma.university.findMany({
        where,
        orderBy: { name: 'asc' },
        select,
      }),
      this.getNearbyPensionCountMap(),
    ]);

    return universities.map((u) => {
      const campuses = includeCampuses && 'campuses' in u ? u.campuses : [];
      return {
        id: u.id,
        name: u.name,
        shortName: u.shortName ?? null,
        acronym: u.shortName ?? null,
        city: u.city ?? '',
        address: u.address ?? '',
        emailDomains: u.emailDomains || [],
        emailDomain: u.emailDomains?.[0] ?? null,
        latitude: u.latitude ?? 0,
        longitude: u.longitude ?? 0,
        campuses: (campuses || []) as CampusAreaResponseDto[],
        imageUrl: null,
        logoUrl: null,
        createdAt: u.createdAt || new Date(),
        updatedAt: u.updatedAt || new Date(),
        _count: {
          students: u._count?.students ?? 0,
          nearbyPensions: countMap.get(u.id) ?? 0,
        },
      };
    });
  }

  async findCampusAreas(city?: string): Promise<CampusAreaResponseDto[]> {
    const where: Prisma.UniversityWhereInput = {
      deletedAt: null,
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    };

    const universities = await this.prisma.university.findMany({
      where,
      select: {
        id: true,
        name: true,
        city: true,
        campuses: true,
      },
    });

    const areas: CampusAreaResponseDto[] = [];
    for (const u of universities) {
      if (Array.isArray(u.campuses)) {
        for (const c of u.campuses) {
          areas.push({
            id: c.id,
            name: c.name,
            acronym: c.acronym,
            centerLat: c.centerLat,
            centerLng: c.centerLng,
            polygon: c.polygon ?? [],
            universityId: u.id,
            universityName: u.name,
            city: u.city,
          });
        }
      }
    }

    return areas;
  }

  async findById(id: string): Promise<unknown> {
    const university = await this.prisma.university.findUnique({
      where: { id },
      select: UNIVERSITY_PUBLIC_SELECT,
    });

    if (!university) {
      throw new NotFoundException(`University '${id}' not found`);
    }

    const nearbyFilter: Prisma.PensionWhereInput = {
      deletedAt: null,
      isActive: true,
      nearbyUniversities: {
        some: {
          universityId: id,
        },
      },
    };

    const [nearbyPensions, nearbyPensionsCount] = await Promise.all([
      this.prisma.pension.findMany({
        where: nearbyFilter,
        take: 10,
        select: {
          id: true,
          slug: true,
          title: true,
          baseMonthlyPrice: true,
          ratingAverage: true,
          ratingCount: true,
        },
      }),
      this.prisma.pension.count({
        where: nearbyFilter,
      }),
    ]);

    return {
      ...university,
      acronym: university.shortName ?? null,
      imageUrl: null,
      nearbyPensions: nearbyPensions.map((pension) => ({
        ...pension,
        pension,
      })),
      _count: {
        students: university._count?.students ?? 0,
        nearbyPensions: nearbyPensionsCount,
      },
    };
  }

  async create(dto: CreateUniversityDto): Promise<unknown> {
    const created = await this.prisma.university.create({
      data: dto,
    });
    this.nearbyCountsCache = null;
    await this.cache?.refresh();
    return created;
  }

  async update(id: string, dto: UpdateUniversityDto): Promise<unknown> {
    await this.ensureExists(id);

    const updated = await this.prisma.university.update({
      where: { id },
      data: dto,
    });
    this.nearbyCountsCache = null;
    await this.cache?.refresh();
    return updated;
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    await this.ensureExists(id);

    await this.prisma.university.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.nearbyCountsCache = null;
    await this.cache?.refresh();

    return { id, deleted: true };
  }
}
