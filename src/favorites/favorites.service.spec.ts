import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { FavoritesService } from './favorites.service.js';

type MockPrismaService = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let mockPrisma: MockPrismaService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new FavoritesService(mockPrisma as unknown as PrismaService);
  });

  it('should return user favorites strictly isolated by userId', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      favoritePensionIds: ['pen-1'],
    });
    mockPrisma.pension.findMany.mockResolvedValue([
      {
        id: 'pen-1',
        slug: 'pension-1',
        title: 'Pensión San Joaquín',
        city: 'Santiago',
        neighborhood: 'San Joaquín',
        baseMonthlyPrice: 250000,
        ratingAverage: 4.5,
        ratingCount: 10,
        images: [],
        createdAt: new Date(),
      },
    ]);

    const result = await service.findAllByUser('user-1');
    expect(result).toHaveLength(1);
    expect(mockPrisma.pension.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['pen-1'] },
        }),
      }),
    );
  });

  it('should add pension to favorites', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockPrisma.user.findUnique.mockResolvedValue({ favoritePensionIds: [] });
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    const result = await service.addFavorite('user-1', 'pen-1');
    expect(result.added).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { favoritePensionIds: { push: 'pen-1' } },
      }),
    );
  });

  it('should throw ConflictException if already favorited', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockPrisma.user.findUnique.mockResolvedValue({ favoritePensionIds: ['pen-1'] });

    await expect(service.addFavorite('user-1', 'pen-1')).rejects.toThrow(ConflictException);
  });

  it('should remove pension from favorites', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ favoritePensionIds: ['pen-1'] });
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });

    const result = await service.removeFavorite('user-1', 'pen-1');
    expect(result.removed).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { favoritePensionIds: { set: [] } },
      }),
    );
  });

  it('should throw NotFoundException when removing non-existent favorite', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ favoritePensionIds: [] });

    await expect(service.removeFavorite('user-1', 'pen-1')).rejects.toThrow(NotFoundException);
  });
});
