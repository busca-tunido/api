import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, RoomType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { RoomsService } from './rooms.service.js';

type MockPrismaService = {
  room: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('RoomsService', () => {
  let service: RoomsService;
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
      room: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
      },
    };

    service = new RoomsService(mockPrisma as unknown as PrismaService);
  });

  describe('findByPension', () => {
    it('should return rooms belonging to pension', async () => {
      mockPrisma.room.findMany.mockResolvedValue([{ id: 'room-1', title: 'Hab 101' }]);

      const result = await service.findByPension('pension-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('should allow pension owner to create room', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });
      mockPrisma.room.create.mockResolvedValue({ id: 'room-new', title: 'Hab 101' });

      const result = await service.create(
        'pension-1',
        {
          roomNumber: '101',
          title: 'Habitación Individual',
          type: RoomType.SINGLE,
          monthlyPrice: 200000,
        },
        mockLandlord,
      );

      expect((result as { id: string }).id).toBe('room-new');
    });

    it('should throw ForbiddenException if user is not pension owner', async () => {
      mockPrisma.pension.findUnique.mockResolvedValue({
        id: 'pension-1',
        landlordId: 'landlord-1',
      });

      await expect(
        service.create(
          'pension-1',
          {
            roomNumber: '101',
            title: 'Habitación Individual',
            type: RoomType.SINGLE,
            monthlyPrice: 200000,
          },
          mockOtherUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should allow pension owner to update room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        pension: { landlordId: 'landlord-1' },
      });
      mockPrisma.room.update.mockResolvedValue({ id: 'room-1', monthlyPrice: 220000 });

      const result = await service.update('room-1', { monthlyPrice: 220000 }, mockLandlord);
      expect((result as { monthlyPrice: number }).monthlyPrice).toBe(220000);
    });

    it('should throw ForbiddenException if user is not pension owner', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        pension: { landlordId: 'landlord-1' },
      });

      await expect(
        service.update('room-1', { monthlyPrice: 220000 }, mockOtherUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should allow owner to delete room', async () => {
      mockPrisma.room.findUnique.mockResolvedValue({
        id: 'room-1',
        pension: { landlordId: 'landlord-1' },
      });
      mockPrisma.room.update.mockResolvedValue({ id: 'room-1', deletedAt: new Date() });

      const result = await service.delete('room-1', mockLandlord);
      expect(result.deleted).toBe(true);
    });

    it('should throw NotFoundException if room does not exist', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      await expect(service.delete('non-existent', mockLandlord)).rejects.toThrow(NotFoundException);
    });
  });
});
