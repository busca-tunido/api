import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { UniversitiesCacheService } from './universities-cache.service.js';

describe('UniversitiesCacheService', () => {
  const mockUniversities = [
    {
      id: 'uni-1',
      name: 'Pontificia Universidad Católica de Chile',
      shortName: 'PUC',
      city: 'Santiago',
      latitude: -33.4998,
      longitude: -70.6152,
    },
    {
      id: 'uni-2',
      name: 'Universidad de Chile',
      shortName: 'UCH',
      city: 'Santiago',
      latitude: -33.4442,
      longitude: -70.6558,
    },
    {
      id: 'uni-3',
      name: 'Universidad de Valparaíso',
      shortName: 'UV',
      city: 'Valparaíso',
      latitude: -33.0425,
      longitude: -71.6148,
    },
  ];

  const mockPrisma = {
    university: {
      findMany: vi.fn().mockResolvedValue(mockUniversities),
    },
  } as unknown as PrismaService;

  it('should initialize and populate cache from prisma', async () => {
    const service = new UniversitiesCacheService(mockPrisma);
    await service.onModuleInit();

    expect(service.getAll()).toHaveLength(3);
    expect(service.getById('uni-1')?.shortName).toBe('PUC');
  });

  it('should find closest universities in the same city within radius', async () => {
    const service = new UniversitiesCacheService(mockPrisma);
    await service.onModuleInit();

    const results = service.findNearby(-33.498, -70.613, {
      city: 'Santiago',
      maxDistanceMeters: 10000,
    });
    expect(results).toHaveLength(2);
    expect(results[0].universityId).toBe('uni-1');
    expect(results[0].distanceMeters).toBeLessThan(1000);
    expect(results[0].walkingMinutes).toBeGreaterThan(0);
  });

  it('should return fallback if no universities within maxDistance', async () => {
    const service = new UniversitiesCacheService(mockPrisma);
    await service.onModuleInit();

    const results = service.findNearby(-33.8, -70.8, {
      city: 'Santiago',
      maxDistanceMeters: 500,
    });
    expect(results).toHaveLength(1);
    expect(results[0].universityId).toBe('uni-1');
  });
});
