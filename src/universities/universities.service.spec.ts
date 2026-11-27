import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import { UniversitiesService } from './universities.service.js';

type MockSqlTransactionClient = {
  university: {
    update: ReturnType<typeof vi.fn>;
  };
  universityEmailDomain: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};

type MockSqlPrismaService = {
  university: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  universityEmailDomain: {
    deleteMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

type MockPrismaService = {
  pension: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe('UniversitiesService', () => {
  let service: UniversitiesService;
  let mockSqlPrisma: MockSqlPrismaService;
  let mockPrisma: MockPrismaService;
  let mockTx: MockSqlTransactionClient;

  beforeEach(() => {
    mockTx = {
      university: {
        update: vi.fn(),
      },
      universityEmailDomain: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
    };

    mockSqlPrisma = {
      university: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      universityEmailDomain: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn(async (fn: (tx: MockSqlTransactionClient) => Promise<unknown>) =>
        fn(mockTx),
      ),
    };

    mockPrisma = {
      pension: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };

    service = new UniversitiesService(
      mockSqlPrisma as unknown as SqlPrismaService,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('should return all universities with normalized domains and nearby pension counts', async () => {
    const now = new Date();
    mockSqlPrisma.university.findMany.mockResolvedValue([
      {
        id: 'uni-1',
        name: 'Universidad de Chile',
        shortName: 'UCH',
        emailDomains: [{ domain: 'uchile.cl' }, { domain: 'alumnos.uchile.cl' }],
        city: 'Santiago',
        address: 'Av. Libertador Bernardo O Higgins 1058',
        latitude: -33.4442,
        longitude: -70.6517,
        campuses: [
          {
            id: 'camp-1',
            name: 'Campus Beauchef',
            acronym: 'FCFM',
            centerLat: -33.4578,
            centerLng: -70.6638,
            polygon: [],
          },
        ],
        createdAt: now,
        updatedAt: now,
        _count: { students: 12 },
      },
    ]);
    mockPrisma.pension.findMany.mockResolvedValue([
      { nearbyUniversities: [{ universityId: 'uni-1' }] },
    ]);

    const result = await service.findAll('Santiago');
    expect(result).toHaveLength(1);
    expect(result[0].emailDomains).toEqual(['uchile.cl', 'alumnos.uchile.cl']);
    expect(result[0].emailDomain).toBe('uchile.cl');
    expect(result[0]._count).toEqual({ students: 12, nearbyPensions: 1 });
    expect(result[0].campuses).toHaveLength(1);
    expect(result[0].campuses?.[0].universityId).toBe('uni-1');
    expect(mockSqlPrisma.university.findMany).toHaveBeenCalled();
  });

  it('should return campus areas from SQL universities', async () => {
    mockSqlPrisma.university.findMany.mockResolvedValue([
      {
        id: 'uni-1',
        name: 'Universidad de Chile',
        city: 'Santiago',
        campuses: [
          {
            id: 'camp-1',
            name: 'Campus Beauchef',
            acronym: 'FCFM',
            centerLat: -33.4578,
            centerLng: -70.6638,
            polygon: [{ latitude: -33.45, longitude: -70.66 }],
          },
        ],
      },
    ]);

    const areas = await service.findCampusAreas('Santiago');
    expect(areas).toHaveLength(1);
    expect(areas[0]).toEqual({
      id: 'camp-1',
      name: 'Campus Beauchef',
      acronym: 'FCFM',
      centerLat: -33.4578,
      centerLng: -70.6638,
      polygon: [{ latitude: -33.45, longitude: -70.66 }],
      universityId: 'uni-1',
      universityName: 'Universidad de Chile',
      city: 'Santiago',
    });
  });

  it('should find university by ID with MongoDB nearby pensions', async () => {
    const now = new Date();
    mockSqlPrisma.university.findUnique.mockResolvedValue({
      id: 'uni-1',
      name: 'Universidad de Chile',
      shortName: 'UCH',
      emailDomains: [{ domain: 'uchile.cl' }],
      city: 'Santiago',
      address: 'Av. Libertador Bernardo O Higgins 1058',
      latitude: -33.4442,
      longitude: -70.6517,
      campuses: [],
      createdAt: now,
      updatedAt: now,
      _count: { students: 5 },
    });
    mockPrisma.pension.findMany.mockResolvedValue([
      {
        id: 'pen-1',
        slug: 'pension-1',
        title: 'Pension 1',
        baseMonthlyPrice: 250000,
        ratingAverage: 4.5,
        ratingCount: 3,
      },
    ]);
    mockPrisma.pension.count.mockResolvedValue(1);

    const result = await service.findById('uni-1');
    expect(result.id).toBe('uni-1');
    expect(result.emailDomains).toEqual(['uchile.cl']);
    expect(result.emailDomain).toBe('uchile.cl');
    expect(result.nearbyPensions).toHaveLength(1);
    expect(result._count).toEqual({ students: 5, nearbyPensions: 1 });
  });

  it('should throw NotFoundException if university is not found', async () => {
    mockSqlPrisma.university.findUnique.mockResolvedValue(null);

    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should create a university with nested emailDomains in PostgreSQL', async () => {
    const now = new Date();
    mockSqlPrisma.university.create.mockResolvedValue({
      id: 'uni-new',
      name: 'Universidad Nueva',
      shortName: 'UN',
      emailDomains: [{ domain: 'unueva.cl' }],
      city: 'Santiago',
      address: 'Calle 123',
      latitude: -33.4,
      longitude: -70.6,
      campuses: [],
      createdAt: now,
      updatedAt: now,
      _count: { students: 0 },
    });

    const result = await service.create({
      name: 'Universidad Nueva',
      shortName: 'UN',
      emailDomains: ['UNueva.cl', 'unueva.cl'],
      city: 'Santiago',
      address: 'Calle 123',
      latitude: -33.4,
      longitude: -70.6,
    });

    expect(result.id).toBe('uni-new');
    expect(result.emailDomains).toEqual(['unueva.cl']);
    expect(result.emailDomain).toBe('unueva.cl');
    expect(mockSqlPrisma.university.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Universidad Nueva',
          emailDomains: {
            create: [{ domain: 'unueva.cl' }],
          },
        }),
      }),
    );
  });

  it('should update university scalar fields and replace emailDomains inside a transaction', async () => {
    const now = new Date();
    mockSqlPrisma.university.findUnique.mockResolvedValue({ id: 'uni-1' });
    mockTx.university.update.mockResolvedValue({
      id: 'uni-1',
      name: 'Universidad Actualizada',
      shortName: 'UA',
      emailDomains: [{ domain: 'ua.cl' }],
      city: 'Santiago',
      address: 'Calle 456',
      latitude: -33.4,
      longitude: -70.6,
      campuses: [],
      createdAt: now,
      updatedAt: now,
      _count: { students: 2 },
    });

    const result = await service.update('uni-1', {
      name: 'Universidad Actualizada',
      emailDomains: ['ua.cl'],
    });

    expect(mockSqlPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockTx.universityEmailDomain.deleteMany).toHaveBeenCalledWith({
      where: { universityId: 'uni-1' },
    });
    expect(mockTx.universityEmailDomain.createMany).toHaveBeenCalledWith({
      data: [{ universityId: 'uni-1', domain: 'ua.cl' }],
    });
    expect(result.name).toBe('Universidad Actualizada');
    expect(result.emailDomains).toEqual(['ua.cl']);
  });

  it('should soft delete university in PostgreSQL', async () => {
    mockSqlPrisma.university.findUnique.mockResolvedValue({ id: 'uni-1' });
    mockSqlPrisma.university.update.mockResolvedValue({ id: 'uni-1' });

    const result = await service.delete('uni-1');
    expect(result).toEqual({ id: 'uni-1', deleted: true });
    expect(mockSqlPrisma.university.update).toHaveBeenCalledWith({
      where: { id: 'uni-1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  describe('findByEmailDomain', () => {
    it('should find university by direct domain', async () => {
      const mockUni = {
        id: 'uni-1',
        name: 'Universidad de Chile',
        shortName: 'UCH',
        city: 'Santiago',
        address: 'Av. Libertador Bernardo O Higgins 1058',
      };
      mockSqlPrisma.university.findFirst.mockResolvedValue(mockUni);

      const result = await service.findByEmailDomain('alumno@uchile.cl');
      expect(result).toEqual(mockUni);
      expect(mockSqlPrisma.university.findFirst).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          emailDomains: {
            some: {
              domain: {
                in: ['uchile.cl'],
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
    });

    it('should find university by subdomain fallback', async () => {
      const mockUni = {
        id: 'uni-1',
        name: 'Universidad de Chile',
        shortName: 'UCH',
        city: 'Santiago',
        address: 'Av. Libertador Bernardo O Higgins 1058',
      };
      mockSqlPrisma.university.findFirst.mockResolvedValue(mockUni);

      const result = await service.findByEmailDomain('alumno@alumnos.uchile.cl');
      expect(result).toEqual(mockUni);
      expect(mockSqlPrisma.university.findFirst).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          emailDomains: {
            some: {
              domain: {
                in: ['alumnos.uchile.cl', 'uchile.cl'],
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
    });

    it('should return null when domain does not match any university', async () => {
      mockSqlPrisma.university.findFirst.mockResolvedValue(null);

      const result = await service.findByEmailDomain('user@unknown.org');
      expect(result).toBeNull();
      expect(mockSqlPrisma.university.findFirst).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          emailDomains: {
            some: {
              domain: {
                in: ['unknown.org'],
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
    });

    it('should return null for invalid email input without querying database', async () => {
      const result = await service.findByEmailDomain('invalid-email-address');
      expect(result).toBeNull();
      expect(mockSqlPrisma.university.findFirst).not.toHaveBeenCalled();
    });
  });
});
