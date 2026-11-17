import { Injectable, type OnModuleInit } from '@nestjs/common';
import {
  calculateHaversineDistanceKm,
  calculateTransitMinutes,
  calculateWalkingMinutes,
} from '../common/utils/geo.util.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type CachedUniversity = {
  id: string;
  name: string;
  shortName: string | null;
  city: string;
  latitude: number;
  longitude: number;
};

export type NearbyUniversityResult = {
  universityId: string;
  name: string;
  shortName: string | null;
  distanceMeters: number;
  walkingMinutes: number | null;
  transitMinutes: number | null;
};

export type CachedUniversityDomainMatch = {
  id: string;
  name: string;
  shortName: string | null;
  city: string;
  address: string;
};

@Injectable()
export class UniversitiesCacheService implements OnModuleInit {
  private cache: CachedUniversity[] = [];
  private domainIndex = new Map<string, CachedUniversityDomainMatch>();
  private initialized = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const list = await this.prisma.university.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        shortName: true,
        city: true,
        address: true,
        emailDomains: true,
        latitude: true,
        longitude: true,
      },
    });

    const nextCache: CachedUniversity[] = [];
    const nextDomainIndex = new Map<string, CachedUniversityDomainMatch>();

    for (const u of list) {
      if (typeof u.latitude === 'number' && typeof u.longitude === 'number') {
        nextCache.push({
          id: u.id,
          name: u.name,
          shortName: u.shortName,
          city: u.city,
          latitude: u.latitude,
          longitude: u.longitude,
        });
      }

      if (Array.isArray(u.emailDomains)) {
        const domainMatch: CachedUniversityDomainMatch = {
          id: u.id,
          name: u.name,
          shortName: u.shortName,
          city: u.city,
          address: u.address,
        };
        for (const rawDomain of u.emailDomains) {
          const domain = rawDomain.toLowerCase().trim();
          if (domain && !nextDomainIndex.has(domain)) {
            nextDomainIndex.set(domain, domainMatch);
          }
        }
      }
    }

    this.cache = nextCache;
    this.domainIndex = nextDomainIndex;
    this.initialized = true;
  }

  findByEmailDomains(candidateDomains: string[]): CachedUniversityDomainMatch | null | undefined {
    if (!this.initialized) {
      return undefined;
    }

    for (const candidate of candidateDomains) {
      const match = this.domainIndex.get(candidate);
      if (match) {
        return match;
      }
    }

    return null;
  }

  getAll(): CachedUniversity[] {
    return this.cache;
  }

  getById(id: string): CachedUniversity | undefined {
    return this.cache.find((u) => u.id === id);
  }

  findNearby(
    lat: number,
    lng: number,
    options: {
      city?: string;
      maxDistanceMeters?: number;
      limit?: number;
    } = {},
  ): NearbyUniversityResult[] {
    const { city, maxDistanceMeters = 5000, limit = 3 } = options;

    if (this.cache.length === 0) {
      return [];
    }

    const normalizedCity = city?.trim().toLowerCase();
    const pool = normalizedCity
      ? this.cache.filter((u) => u.city.toLowerCase() === normalizedCity)
      : this.cache;

    const targetPool = pool.length > 0 ? pool : this.cache;

    const scored = targetPool
      .map((uni) => {
        const distKm = calculateHaversineDistanceKm(lat, lng, uni.latitude, uni.longitude);
        const distanceMeters = Math.round(distKm * 1000);
        return {
          universityId: uni.id,
          name: uni.name,
          shortName: uni.shortName,
          distanceMeters,
          walkingMinutes: calculateWalkingMinutes(distanceMeters),
          transitMinutes: calculateTransitMinutes(distanceMeters),
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const withinRadius = scored.filter((item) => item.distanceMeters <= maxDistanceMeters);
    if (withinRadius.length > 0) {
      return withinRadius.slice(0, limit);
    }

    return scored.slice(0, Math.min(limit, 1));
  }
}
