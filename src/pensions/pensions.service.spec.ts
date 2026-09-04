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

  beforeEach(() => {
    mockPrisma = {
      pension: {
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new PensionsService(mockPrisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('should return paginated pensions', async () => {
      mockPrisma.pension.findMany.mockResolvedValue([
        { id: 'pension-1', title: 'Pensión San Joaquín' },
      ]);
      mockPrisma.pension.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
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

    it('should throw ForbiddenException if user does not own the pension', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });

      await expect(service.delete('pension-1', mockOtherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
