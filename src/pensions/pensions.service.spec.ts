import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { PensionsService } from './pensions.service.js';

type MockPrismaService = {
  pension: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
};

describe('PensionsService', () => {
  let service: PensionsService;
  let mockPrisma: MockPrismaService;

  const mockLandlord: SanitizedUser = {
    id: 'landlord-1',
    email: 'landlord@test.cl',
    firstName: 'Carlos',
    lastName: 'Valdés',
    phone: null,
    avatarUrl: null,
    role: Role.LANDLORD,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOtherUser: SanitizedUser = {
    id: 'other-user',
    email: 'other@test.cl',
    firstName: 'Otro',
    lastName: 'Usuario',
    phone: null,
    avatarUrl: null,
    role: Role.LANDLORD,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAdmin: SanitizedUser = {
    id: 'admin-1',
    email: 'admin@test.cl',
    firstName: 'Admin',
    lastName: 'User',
    phone: null,
    avatarUrl: null,
    role: Role.ADMIN,
    isEmailVerified: true,
    universityId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = {
      pension: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        groupBy: vi.fn().mockResolvedValue([{ city: 'Santiago', _count: { id: 5 } }]),
      },
    };

    service = new PensionsService(mockPrisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated pensions without geo coordinates', async () => {
      mockPrisma.pension.findMany.mockResolvedValue([
        { id: 'pension-1', title: 'Pensión San Joaquín', city: 'Santiago' },
      ]);
      mockPrisma.pension.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.nearbyCityCounts).toEqual([{ city: 'Santiago', count: 5 }]);
    });

    it('should filter by radius and calculate relevance score when coordinates are provided', async () => {
      const closePension = {
        id: 'pen-close',
        title: 'Pensión Cercana',
        city: 'Santiago',
        latitude: -33.45,
        longitude: -70.66,
        baseMonthlyPrice: 250000,
        ratingAverage: 4.8,
        ratingCount: 10,
        verificationStatus: 'OFFICIALLY_VERIFIED',
        rooms: [{ availableBeds: 2 }],
        amenities: [{ category: 'BASIC_UTILITY', slug: 'wifi-fibra' }],
        images: [],
        nearbyUniversities: [],
        _count: { rooms: 3, reviews: 10 },
      };

      const farPension = {
        id: 'pen-far',
        title: 'Pensión Lejana',
        city: 'Rancagua',
        latitude: -34.17,
        longitude: -70.74,
        baseMonthlyPrice: 180000,
        ratingAverage: 4.0,
        ratingCount: 2,
        verificationStatus: 'UNVERIFIED',
        rooms: [{ availableBeds: 1 }],
        amenities: [],
        images: [],
        nearbyUniversities: [],
        _count: { rooms: 2, reviews: 2 },
      };

      mockPrisma.pension.findMany.mockResolvedValue([closePension, farPension]);

      const result = await service.findAll({
        latitude: -33.4489,
        longitude: -70.6693,
        radiusKm: 30,
        sortBy: 'relevance',
      });

      expect(result.items).toHaveLength(1);
      const item = result.items[0] as typeof closePension & {
        distanceKm: number;
        relevanceScore: number;
      };
      expect(item.id).toBe('pen-close');
      expect(item.distanceKm).toBeLessThanOrEqual(30);
      expect(item.relevanceScore).toBeGreaterThan(0);
      expect(result.nearbyCityCounts.length).toBeGreaterThan(0);
    });

    it('should sort by distance ascending when sortBy=distance is specified', async () => {
      const pen1 = {
        id: 'pen-1',
        title: 'Pensión 1 km',
        city: 'Santiago',
        latitude: -33.44,
        longitude: -70.66,
        baseMonthlyPrice: 300000,
        ratingAverage: 4.0,
        ratingCount: 5,
        verificationStatus: 'COMMUNITY_VERIFIED',
        rooms: [{ availableBeds: 1 }],
        amenities: [],
      };
      const pen2 = {
        id: 'pen-2',
        title: 'Pensión 5 km',
        city: 'Santiago',
        latitude: -33.4,
        longitude: -70.6,
        baseMonthlyPrice: 200000,
        ratingAverage: 5.0,
        ratingCount: 20,
        verificationStatus: 'OFFICIALLY_VERIFIED',
        rooms: [{ availableBeds: 2 }],
        amenities: [],
      };

      mockPrisma.pension.findMany.mockResolvedValue([pen2, pen1]);

      const result = await service.findAll({
        latitude: -33.4489,
        longitude: -70.6693,
        radiusKm: 30,
        sortBy: 'distance',
      });

      expect(result.items).toHaveLength(2);
      const first = result.items[0] as { id: string };
      expect(first.id).toBe('pen-1');
    });
  });

  describe('findBySlugOrId', () => {
    it('should return pension if found', async () => {
      mockPrisma.pension.findFirst.mockResolvedValue({ id: 'pension-1', slug: 'pension-1-slug' });

      const result = await service.findBySlugOrId('pension-1-slug');
      expect((result as { id: string }).id).toBe('pension-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.pension.findFirst.mockResolvedValue(null);

      await expect(service.findBySlugOrId('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create pension assigned to landlord', async () => {
      mockPrisma.pension.create.mockResolvedValue({ id: 'pension-new', slug: 'pension-new-slug' });

      const result = await service.create(
        {
          title: 'Nueva Pensión',
          description: 'Cerca del metro',
          address: 'Av. Brasil 123',
          city: 'Valparaíso',
          neighborhood: 'El Plan',
          latitude: -33.04,
          longitude: -71.61,
          baseMonthlyPrice: 200000,
        },
        mockLandlord,
      );

      expect((result as { id: string }).id).toBe('pension-new');
      expect(mockPrisma.pension.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should allow owner to update their pension', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1', title: 'Updated Title' });

      const result = await service.update('pension-1', { title: 'Updated Title' }, mockLandlord);
      expect((result as { title: string }).title).toBe('Updated Title');
    });

    it('should allow ADMIN to update any pension regardless of ownership', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1', title: 'Admin Updated' });

      const result = await service.update('pension-1', { title: 'Admin Updated' }, mockAdmin);
      expect((result as { title: string }).title).toBe('Admin Updated');
    });

    it('should throw ForbiddenException if user does not own the pension', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });

      await expect(
        service.update('pension-1', { title: 'Updated Title' }, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should allow owner to delete their pension', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1', deletedAt: new Date() });

      const result = await service.delete('pension-1', mockLandlord);
      expect(result.deleted).toBe(true);
    });

    it('should allow ADMIN to delete any pension regardless of ownership', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });
      mockPrisma.pension.update.mockResolvedValue({ id: 'pension-1', deletedAt: new Date() });

      const result = await service.delete('pension-1', mockAdmin);
      expect(result.deleted).toBe(true);
    });

    it('should throw ForbiddenException if user does not own the pension', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });

      await expect(service.delete('pension-1', mockOtherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
