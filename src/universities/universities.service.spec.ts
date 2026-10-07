import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { UniversitiesService } from './universities.service.js';

type MockPrismaService = {
  university: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('UniversitiesService', () => {
  let service: UniversitiesService;
  let mockPrisma: MockPrismaService;

  beforeEach(() => {
    mockPrisma = {
      university: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new UniversitiesService(mockPrisma as unknown as PrismaService);
  });

  it('should return all universities', async () => {
    mockPrisma.university.findMany.mockResolvedValue([
      { id: 'uni-1', name: 'Universidad de Chile' },
    ]);

    const result = await service.findAll('Santiago');
    expect(result).toHaveLength(1);
    expect(mockPrisma.university.findMany).toHaveBeenCalled();
  });

  it('should find university by ID', async () => {
    mockPrisma.university.findUnique.mockResolvedValue({
      id: 'uni-1',
      name: 'Universidad de Chile',
    });

    const result = await service.findById('uni-1');
    expect((result as { id: string }).id).toBe('uni-1');
  });

  it('should throw NotFoundException if university is not found', async () => {
    mockPrisma.university.findUnique.mockResolvedValue(null);

    await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should create a university', async () => {
    mockPrisma.university.create.mockResolvedValue({ id: 'uni-new', name: 'Universidad Nueva' });

    const result = await service.create({
      name: 'Universidad Nueva',
      city: 'Santiago',
      address: 'Calle 123',
      latitude: -33.4,
      longitude: -70.6,
    });

    expect((result as { id: string }).id).toBe('uni-new');
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
      mockPrisma.university.findFirst.mockResolvedValue(mockUni);

      const result = await service.findByEmailDomain('alumno@uchile.cl');
      expect(result).toEqual(mockUni);
      expect(mockPrisma.university.findFirst).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          emailDomains: { hasSome: ['uchile.cl'] },
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
      mockPrisma.university.findFirst.mockResolvedValue(mockUni);

      const result = await service.findByEmailDomain('alumno@alumnos.uchile.cl');
      expect(result).toEqual(mockUni);
      expect(mockPrisma.university.findFirst).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          emailDomains: { hasSome: ['alumnos.uchile.cl', 'uchile.cl'] },
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
      mockPrisma.university.findFirst.mockResolvedValue(null);

      const result = await service.findByEmailDomain('user@unknown.org');
      expect(result).toBeNull();
      expect(mockPrisma.university.findFirst).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          emailDomains: { hasSome: ['unknown.org'] },
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
      expect(mockPrisma.university.findFirst).not.toHaveBeenCalled();
    });
  });
});
