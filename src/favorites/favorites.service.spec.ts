import { ConflictException, NotFoundException } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';
import { FavoritesService } from './favorites.service.js';

type MockSqlPrismaService = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  userFavorite: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

type MockPrismaService = {
  pension: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('FavoritesService', () => {
  let service: FavoritesService;
  let mockSqlPrisma: MockSqlPrismaService;
  let mockPrisma: MockPrismaService;

  beforeEach(() => {
    mockSqlPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      userFavorite: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
    };

    mockPrisma = {
      pension: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new FavoritesService(
      mockSqlPrisma as unknown as SqlPrismaService,
      mockPrisma as unknown as PrismaService,
    );
  });

  it('should return user favorites strictly isolated by userId with favorite createdAt', async () => {
    const favoriteCreatedAt = new Date('2026-03-01T10:00:00.000Z');
    mockSqlPrisma.userFavorite.findMany.mockResolvedValue([
      {
        pensionId: 'pen-1',
        createdAt: favoriteCreatedAt,
      },
    ]);
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
        verificationStatus: VerificationStatus.OFFICIALLY_VERIFIED,
        images: [],
      },
    ]);

    const result = await service.findAllByUser('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      userId: 'user-1',
      pensionId: 'pen-1',
      createdAt: favoriteCreatedAt,
      pension: {
        id: 'pen-1',
        slug: 'pension-1',
      },
    });
    expect(mockSqlPrisma.userFavorite.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { pensionId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockPrisma.pension.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['pen-1'] },
          isActive: true,
          deletedAt: null,
        }),
      }),
    );
  });

  it('should return empty array when user has no favorites', async () => {
    mockSqlPrisma.userFavorite.findMany.mockResolvedValue([]);

    const result = await service.findAllByUser('user-1');
    expect(result).toEqual([]);
    expect(mockPrisma.pension.findMany).not.toHaveBeenCalled();
  });

  it('should return only favorite pension ids', async () => {
    mockSqlPrisma.userFavorite.findMany.mockResolvedValue([
      { pensionId: 'pen-1' },
      { pensionId: 'pen-2' },
    ]);

    const result = await service.findIdsByUser('user-1');
    expect(result).toEqual({ pensionIds: ['pen-1', 'pen-2'] });
    expect(mockSqlPrisma.userFavorite.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { pensionId: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should add pension to favorites', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockSqlPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockSqlPrisma.userFavorite.findUnique.mockResolvedValue(null);
    mockSqlPrisma.userFavorite.create.mockResolvedValue({
      userId: 'user-1',
      pensionId: 'pen-1',
    });

    const result = await service.addFavorite('user-1', 'pen-1');
    expect(result).toEqual({ added: true });
    expect(mockSqlPrisma.userFavorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_pensionId: {
          userId: 'user-1',
          pensionId: 'pen-1',
        },
      },
      select: { userId: true },
    });
    expect(mockSqlPrisma.userFavorite.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        pensionId: 'pen-1',
      },
    });
  });

  it('should throw NotFoundException if pension does not exist when adding favorite', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue(null);
    mockSqlPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(service.addFavorite('user-1', 'missing-pen')).rejects.toThrow(NotFoundException);
    expect(mockSqlPrisma.userFavorite.create).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException if user does not exist when adding favorite', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockSqlPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.addFavorite('missing-user', 'pen-1')).rejects.toThrow(NotFoundException);
    expect(mockSqlPrisma.userFavorite.create).not.toHaveBeenCalled();
  });

  it('should throw ConflictException if already favorited', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ id: 'pen-1' });
    mockSqlPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockSqlPrisma.userFavorite.findUnique.mockResolvedValue({ userId: 'user-1' });

    await expect(service.addFavorite('user-1', 'pen-1')).rejects.toThrow(ConflictException);
    expect(mockSqlPrisma.userFavorite.create).not.toHaveBeenCalled();
  });

  it('should remove pension from favorites', async () => {
    mockSqlPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockSqlPrisma.userFavorite.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockSqlPrisma.userFavorite.delete.mockResolvedValue({
      userId: 'user-1',
      pensionId: 'pen-1',
    });

    const result = await service.removeFavorite('user-1', 'pen-1');
    expect(result).toEqual({ removed: true });
    expect(mockSqlPrisma.userFavorite.delete).toHaveBeenCalledWith({
      where: {
        userId_pensionId: {
          userId: 'user-1',
          pensionId: 'pen-1',
        },
      },
    });
  });

  it('should throw NotFoundException when removing favorite for non-existent user', async () => {
    mockSqlPrisma.user.findUnique.mockResolvedValue(null);

    await expect(service.removeFavorite('missing-user', 'pen-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(mockSqlPrisma.userFavorite.delete).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when removing non-existent favorite', async () => {
    mockSqlPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    mockSqlPrisma.userFavorite.findUnique.mockResolvedValue(null);

    await expect(service.removeFavorite('user-1', 'pen-1')).rejects.toThrow(NotFoundException);
    expect(mockSqlPrisma.userFavorite.delete).not.toHaveBeenCalled();
  });
});
