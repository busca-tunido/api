import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { FavoritesService } from './favorites.service.js';

type MockPrismaService = {
  favorite: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let mockPrisma: MockPrismaService;

  beforeEach(() => {
    mockPrisma = {
      favorite: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      pension: {
        findUnique: vi.fn(),
      },
    };

    service = new FavoritesService(mockPrisma as unknown as PrismaService);
  });

  it('should return user favorites', async () => {
    mockPrisma.favorite.findMany.mockResolvedValue([{ pensionId: 'pen-1', userId: 'user-1' }]);

    const result = await service.findAllByUser('user-1');
    expect(result).toHaveLength(1);
  });

  it('should add pension to favorites', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockPrisma.favorite.findUnique.mockResolvedValue(null);
    mockPrisma.favorite.create.mockResolvedValue({ pensionId: 'pen-1', userId: 'user-1' });

    const result = await service.addFavorite('user-1', 'pen-1');
    expect(result.added).toBe(true);
  });

  it('should throw ConflictException if already favorited', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockPrisma.favorite.findUnique.mockResolvedValue({ pensionId: 'pen-1', userId: 'user-1' });

    await expect(service.addFavorite('user-1', 'pen-1')).rejects.toThrow(ConflictException);
  });

  it('should remove pension from favorites', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue({ pensionId: 'pen-1', userId: 'user-1' });
    mockPrisma.favorite.delete.mockResolvedValue({ pensionId: 'pen-1', userId: 'user-1' });

    const result = await service.removeFavorite('user-1', 'pen-1');
    expect(result.removed).toBe(true);
  });

  it('should throw NotFoundException when removing non-existent favorite', async () => {
    mockPrisma.favorite.findUnique.mockResolvedValue(null);

    await expect(service.removeFavorite('user-1', 'pen-1')).rejects.toThrow(NotFoundException);
  });
});
