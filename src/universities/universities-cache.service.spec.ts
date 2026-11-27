import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import { UniversitiesCacheService } from './universities-cache.service.js';

vi.mock('../env.js', () => ({
  env: {
    SQL_DATABASE_URL: 'postgresql://test:test@localhost:5432/buscatunido_test',
  },
}));

type MockSqlPrismaService = {
  university: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('UniversitiesCacheService', () => {
  const originalSkipDbConnect = process.env.SKIP_DB_CONNECT;

  afterEach(() => {
    if (originalSkipDbConnect === undefined) {
      delete process.env.SKIP_DB_CONNECT;
    } else {
      process.env.SKIP_DB_CONNECT = originalSkipDbConnect;
    }
  });

  const mockUniversities = [
    {
      id: 'uni-1',
      name: 'Pontificia Universidad Católica de Chile',
      shortName: 'PUC',
      city: 'Santiago',
      address: 'Av. Libertador Bernardo O Higgins 340',
      emailDomains: [{ domain: 'uc.cl' }, { domain: 'puc.cl' }],
      latitude: -33.4998,
      longitude: -70.6152,
    },
    {
      id: 'uni-2',
      name: 'Universidad de Chile',
      shortName: 'UCH',
      city: 'Santiago',
      address: 'Av. Libertador Bernardo O Higgins 1058',
      emailDomains: [{ domain: 'uchile.cl' }, { domain: 'alumnos.uchile.cl' }],
      latitude: -33.4442,
      longitude: -70.6558,
    },
    {
      id: 'uni-3',
      name: 'Universidad de Valparaíso',
      shortName: 'UV',
      city: 'Valparaíso',
      address: 'Errázuriz 1834',
      emailDomains: [{ domain: 'uv.cl' }],
      latitude: -33.0425,
      longitude: -71.6148,
    },
  ];

  const createMockSqlPrisma = (): MockSqlPrismaService => ({
    university: {
      findMany: vi.fn().mockResolvedValue(mockUniversities),
    },
  });

  it('should initialize and populate cache and domain index from sqlPrisma', async () => {
    const mockSqlPrisma = createMockSqlPrisma();
    const service = new UniversitiesCacheService(mockSqlPrisma as unknown as SqlPrismaService);
    await service.onModuleInit();

    expect(service.getAll()).toHaveLength(3);
    expect(service.getById('uni-1')?.shortName).toBe('PUC');
    expect(service.findByEmailDomains(['alumnos.uchile.cl', 'uchile.cl'])).toEqual({
      id: 'uni-2',
      name: 'Universidad de Chile',
      shortName: 'UCH',
      city: 'Santiago',
      address: 'Av. Libertador Bernardo O Higgins 1058',
    });
    expect(service.findByEmailDomains(['unknown.org'])).toBeNull();
  });

  it('should skip initialization when SKIP_DB_CONNECT is true', async () => {
    process.env.SKIP_DB_CONNECT = 'true';
    const mockSqlPrisma = createMockSqlPrisma();
    const service = new UniversitiesCacheService(mockSqlPrisma as unknown as SqlPrismaService);
    await service.onModuleInit();

    expect(mockSqlPrisma.university.findMany).not.toHaveBeenCalled();
    expect(service.getAll()).toHaveLength(0);
    expect(service.findByEmailDomains(['uchile.cl'])).toBeUndefined();
  });

  it('should find closest universities in the same city within radius', async () => {
    const mockSqlPrisma = createMockSqlPrisma();
    const service = new UniversitiesCacheService(mockSqlPrisma as unknown as SqlPrismaService);
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
    const mockSqlPrisma = createMockSqlPrisma();
    const service = new UniversitiesCacheService(mockSqlPrisma as unknown as SqlPrismaService);
    await service.onModuleInit();

    const results = service.findNearby(-33.8, -70.8, {
      city: 'Santiago',
      maxDistanceMeters: 500,
    });
    expect(results).toHaveLength(1);
    expect(results[0].universityId).toBe('uni-1');
  });
});
