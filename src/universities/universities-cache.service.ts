import { Injectable, type OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CachedUniversity {
  id: string;
  name: string;
  shortName: string | null;
  city: string;
  latitude: number;
  longitude: number;
}

export interface NearbyUniversityResult {
  universityId: string;
  name: string;
  shortName: string | null;
  distanceMeters: number;
  walkingMinutes: number | null;
  transitMinutes: number | null;
}

const calculateHaversineDistanceKm = (
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
  return R * c;
};

@Injectable()
export class UniversitiesCacheService implements OnModuleInit {
  private cache: CachedUniversity[] = [];

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
        latitude: true,
        longitude: true,
      },
    });

    this.cache = list.filter(
      (u): u is CachedUniversity =>
        typeof u.latitude === 'number' && typeof u.longitude === 'number',
    );
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
          walkingMinutes: Math.round(distanceMeters / 80),
          transitMinutes: Math.round(distanceMeters / 250 + 4),
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
