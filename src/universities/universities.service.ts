import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { Prisma as MongoPrisma } from '@prisma/client';
import type { Prisma } from '@prisma/sql-client';
import { PrismaService } from '../prisma/prisma.service.js';
import { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import type { CampusAreaResponseDto, GeoCoordinateDto } from './dto/campus-area.dto.js';
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

export type NearbyPensionItem = {
  id: string;
  slug: string;
  title: string;
  baseMonthlyPrice: number;
  ratingAverage: number;
  ratingCount: number;
};

export type UniversityNearbyPensionEntry = NearbyPensionItem & {
  pension: NearbyPensionItem;
};

export type UniversityDetailResponse = UniversityResponseDto & {
  nearbyPensions: UniversityNearbyPensionEntry[];
};

type CampusAreaRow = {
  id: string;
  name: string;
  acronym: string;
  centerLat: number;
  centerLng: number;
  polygon: Prisma.JsonValue;
};

type UniversityMapperInput = {
  id: string;
  name: string;
  shortName: string | null;
  emailDomains?: Array<{ domain: string } | string>;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  campuses?: CampusAreaRow[];
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    students: number;
  };
};

const CAMPUS_AREA_SELECT = {
  id: true,
  name: true,
  acronym: true,
  centerLat: true,
  centerLng: true,
  polygon: true,
} satisfies Prisma.CampusAreaSelect;

const UNIVERSITY_PUBLIC_SELECT_NO_CAMPUSES = {
  id: true,
  name: true,
  shortName: true,
  emailDomains: {
    select: {
      domain: true,
    },
  },
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      students: true,
    },
  },
} satisfies Prisma.UniversitySelect;

const UNIVERSITY_PUBLIC_SELECT = {
  ...UNIVERSITY_PUBLIC_SELECT_NO_CAMPUSES,
  campuses: {
    select: CAMPUS_AREA_SELECT,
  },
} satisfies Prisma.UniversitySelect;

const NEARBY_COUNTS_TTL_MS = 60_000;

@Injectable()
export class UniversitiesService {
  private nearbyCountsCache: { map: Map<string, number>; expiresAt: number } | null = null;

  constructor(
    private readonly sqlPrisma: SqlPrismaService,
    private readonly prisma: PrismaService,
    @Optional() private readonly cache?: UniversitiesCacheService,
  ) {}

  private extractDomains(emailDomains: Array<{ domain: string } | string> | undefined): string[] {
    if (!Array.isArray(emailDomains)) {
      return [];
    }
    return emailDomains.map((d) => (typeof d === 'string' ? d : d.domain));
  }

  private normalizeEmailDomains(emailDomains?: string[]): string[] {
    if (!Array.isArray(emailDomains)) {
      return [];
    }
    const seen = new Set<string>();
    for (const raw of emailDomains) {
      const normalized = raw.toLowerCase().trim();
      if (normalized) {
        seen.add(normalized);
      }
    }
    return Array.from(seen);
  }

  private mapCampuses(
    u: { id: string; name: string; city: string },
    campuses: CampusAreaRow[] | undefined,
  ): CampusAreaResponseDto[] {
    if (!Array.isArray(campuses)) {
      return [];
    }
    return campuses.map((c) => ({
      id: c.id,
      name: c.name,
      acronym: c.acronym,
      centerLat: c.centerLat,
      centerLng: c.centerLng,
      polygon: Array.isArray(c.polygon) ? (c.polygon as unknown as GeoCoordinateDto[]) : [],
      universityId: u.id,
      universityName: u.name,
      city: u.city,
    }));
  }

  private mapUniversityResponse(
    u: UniversityMapperInput,
    nearbyPensionsCount: number,
    includeCampuses: boolean,
  ): UniversityResponseDto {
    const domains = this.extractDomains(u.emailDomains);
    const campuses = includeCampuses ? this.mapCampuses(u, u.campuses) : [];

    return {
      id: u.id,
      name: u.name,
      shortName: u.shortName ?? null,
      acronym: u.shortName ?? null,
      city: u.city ?? '',
      address: u.address ?? '',
      emailDomains: domains,
      emailDomain: domains[0] ?? null,
      latitude: u.latitude ?? 0,
      longitude: u.longitude ?? 0,
      campuses,
      imageUrl: null,
      logoUrl: null,
      createdAt: u.createdAt ?? new Date(),
      updatedAt: u.updatedAt ?? new Date(),
      _count: {
        students: u._count?.students ?? 0,
        nearbyPensions: nearbyPensionsCount,
      },
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.sqlPrisma.university.findUnique({
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

    return this.sqlPrisma.university.findFirst({
      where: {
        deletedAt: null,
        emailDomains: {
          some: {
            domain: {
              in: candidateDomains,
            },
          },
        },
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

    const [universities, countMap] = await Promise.all([
      includeCampuses
        ? this.sqlPrisma.university.findMany({
            where,
            orderBy: { name: 'asc' },
            select: UNIVERSITY_PUBLIC_SELECT,
          })
        : this.sqlPrisma.university.findMany({
            where,
            orderBy: { name: 'asc' },
            select: UNIVERSITY_PUBLIC_SELECT_NO_CAMPUSES,
          }),
      this.getNearbyPensionCountMap(),
    ]);

    return universities.map((u) =>
      this.mapUniversityResponse(u, countMap.get(u.id) ?? 0, includeCampuses),
    );
  }

  async findCampusAreas(city?: string): Promise<CampusAreaResponseDto[]> {
    const where: Prisma.UniversityWhereInput = {
      deletedAt: null,
      ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
    };

    const universities = await this.sqlPrisma.university.findMany({
      where,
      select: {
        id: true,
        name: true,
        city: true,
        campuses: {
          select: CAMPUS_AREA_SELECT,
        },
      },
    });

    const areas: CampusAreaResponseDto[] = [];
    for (const u of universities) {
      areas.push(...this.mapCampuses(u, u.campuses));
    }

    return areas;
  }

  async findById(id: string): Promise<UniversityDetailResponse> {
    const university = await this.sqlPrisma.university.findUnique({
      where: { id },
      select: UNIVERSITY_PUBLIC_SELECT,
    });

    if (!university) {
      throw new NotFoundException(`University '${id}' not found`);
    }

    const nearbyFilter: MongoPrisma.PensionWhereInput = {
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
      ...this.mapUniversityResponse(university, nearbyPensionsCount, true),
      nearbyPensions: nearbyPensions.map((pension) => ({
        ...pension,
        pension,
      })),
    };
  }

  async create(dto: CreateUniversityDto): Promise<UniversityResponseDto> {
    const { emailDomains, ...scalarData } = dto;
    const normalizedDomains = this.normalizeEmailDomains(emailDomains);

    const created = await this.sqlPrisma.university.create({
      data: {
        ...scalarData,
        ...(normalizedDomains.length > 0
          ? {
              emailDomains: {
                create: normalizedDomains.map((domain) => ({ domain })),
              },
            }
          : {}),
      },
      select: UNIVERSITY_PUBLIC_SELECT,
    });

    this.nearbyCountsCache = null;
    await this.cache?.refresh();

    return this.mapUniversityResponse(created, 0, true);
  }

  async update(id: string, dto: UpdateUniversityDto): Promise<UniversityResponseDto> {
    await this.ensureExists(id);

    const { emailDomains, ...scalarData } = dto;
    const hasEmailDomains = emailDomains !== undefined;
    const normalizedDomains = hasEmailDomains ? this.normalizeEmailDomains(emailDomains) : [];

    const updated = hasEmailDomains
      ? await this.sqlPrisma.$transaction(async (tx) => {
          await tx.universityEmailDomain.deleteMany({
            where: { universityId: id },
          });
          if (normalizedDomains.length > 0) {
            await tx.universityEmailDomain.createMany({
              data: normalizedDomains.map((domain) => ({
                universityId: id,
                domain,
              })),
            });
          }

          return tx.university.update({
            where: { id },
            data: scalarData,
            select: UNIVERSITY_PUBLIC_SELECT,
          });
        })
      : await this.sqlPrisma.university.update({
          where: { id },
          data: scalarData,
          select: UNIVERSITY_PUBLIC_SELECT,
        });

    this.nearbyCountsCache = null;
    await this.cache?.refresh();

    const countMap = await this.getNearbyPensionCountMap();
    return this.mapUniversityResponse(updated, countMap.get(updated.id) ?? 0, true);
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    await this.ensureExists(id);

    await this.sqlPrisma.university.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.nearbyCountsCache = null;
    await this.cache?.refresh();

    return { id, deleted: true };
  }
}
