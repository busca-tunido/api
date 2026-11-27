import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { VerificationStatus } from '@prisma/client';
import { resolvePensionThumbnailUrl } from '../pensions/utils/pension-helpers.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SqlPrismaService } from '../sql-prisma/sql-prisma.service.js';

type EmbeddedPensionImageRaw = {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
};

type FavoriteItemResult = {
  userId: string;
  pensionId: string;
  createdAt: Date;
  pension: {
    id: string;
    slug: string;
    title: string;
    city: string;
    neighborhood: string;
    baseMonthlyPrice: number;
    ratingAverage: number;
    ratingCount: number;
    verificationStatus: VerificationStatus;
    images: EmbeddedPensionImageRaw[];
  };
};

@Injectable()
export class FavoritesService {
  constructor(
    private readonly sqlPrisma: SqlPrismaService,
    private readonly prisma: PrismaService,
  ) {}

  async findIdsByUser(userId: string): Promise<{ pensionIds: string[] }> {
    const rows = await this.sqlPrisma.userFavorite.findMany({
      where: { userId },
      select: { pensionId: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      pensionIds: rows.map((r) => r.pensionId),
    };
  }

  async findAllByUser(userId: string): Promise<FavoriteItemResult[]> {
    const favoriteRows = await this.sqlPrisma.userFavorite.findMany({
      where: { userId },
      select: { pensionId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (favoriteRows.length === 0) {
      return [];
    }

    const ids = favoriteRows.map((row) => row.pensionId);

    const pensions = await this.prisma.pension.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        city: true,
        neighborhood: true,
        baseMonthlyPrice: true,
        ratingAverage: true,
        ratingCount: true,
        verificationStatus: true,
        images: true,
      },
    });

    const pensionMap = new Map(pensions.map((pension) => [pension.id, pension]));
    const results: FavoriteItemResult[] = [];

    for (const row of favoriteRows) {
      const pension = pensionMap.get(row.pensionId);
      if (!pension) {
        continue;
      }

      const images = (pension.images || [])
        .slice()
        .sort(
          (a: EmbeddedPensionImageRaw, b: EmbeddedPensionImageRaw) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        )
        .slice(0, 1)
        .map((img: EmbeddedPensionImageRaw) => ({
          ...img,
          thumbnailUrl: resolvePensionThumbnailUrl(img.url, img.thumbnailUrl),
        }));

      results.push({
        userId,
        pensionId: pension.id,
        createdAt: row.createdAt,
        pension: {
          id: pension.id,
          slug: pension.slug,
          title: pension.title,
          city: pension.city,
          neighborhood: pension.neighborhood,
          baseMonthlyPrice: pension.baseMonthlyPrice,
          ratingAverage: pension.ratingAverage,
          ratingCount: pension.ratingCount,
          verificationStatus: pension.verificationStatus,
          images,
        },
      });
    }

    return results;
  }

  async addFavorite(userId: string, pensionId: string): Promise<{ added: boolean }> {
    const [pension, user] = await Promise.all([
      this.prisma.pension.findUnique({
        where: { id: pensionId },
        select: { id: true },
      }),
      this.sqlPrisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    ]);

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const existing = await this.sqlPrisma.userFavorite.findUnique({
      where: {
        userId_pensionId: {
          userId,
          pensionId: pension.id,
        },
      },
      select: { userId: true },
    });

    if (existing) {
      throw new ConflictException('Pension is already saved in favorites');
    }

    await this.sqlPrisma.userFavorite.create({
      data: {
        userId,
        pensionId: pension.id,
      },
    });

    return { added: true };
  }

  async removeFavorite(userId: string, pensionId: string): Promise<{ removed: boolean }> {
    const user = await this.sqlPrisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const existing = await this.sqlPrisma.userFavorite.findUnique({
      where: {
        userId_pensionId: {
          userId,
          pensionId,
        },
      },
      select: { userId: true },
    });

    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }

    await this.sqlPrisma.userFavorite.delete({
      where: {
        userId_pensionId: {
          userId,
          pensionId,
        },
      },
    });

    return { removed: true };
  }
}
