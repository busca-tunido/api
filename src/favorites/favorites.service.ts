import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

interface EmbeddedPensionImageRaw {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string | null;
  isFeatured?: boolean;
  sortOrder?: number;
}

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<unknown[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { favoritePensionIds: true },
    });

    const ids = user?.favoritePensionIds || [];
    if (ids.length === 0) {
      return [];
    }

    const pensions = await this.prisma.pension.findMany({
      where: {
        id: { in: ids },
        isActive: true,
        deletedAt: null,
      },
    });

    return pensions.map((pension) => {
      const images = (pension.images || [])
        .slice()
        .sort(
          (a: EmbeddedPensionImageRaw, b: EmbeddedPensionImageRaw) =>
            (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        )
        .slice(0, 1);

      return {
        userId,
        pensionId: pension.id,
        createdAt: pension.createdAt,
        pension: {
          id: pension.id,
          slug: pension.slug,
          title: pension.title,
          city: pension.city,
          neighborhood: pension.neighborhood,
          baseMonthlyPrice: pension.baseMonthlyPrice,
          ratingAverage: pension.ratingAverage,
          ratingCount: pension.ratingCount,
          images,
        },
      };
    });
  }

  async addFavorite(userId: string, pensionId: string): Promise<{ added: boolean }> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
      select: { id: true },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { favoritePensionIds: true },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const currentFavorites = user.favoritePensionIds || [];
    if (currentFavorites.includes(pensionId)) {
      throw new ConflictException('Pension is already saved in favorites');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        favoritePensionIds: { push: pensionId },
      },
    });

    return { added: true };
  }

  async removeFavorite(userId: string, pensionId: string): Promise<{ removed: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { favoritePensionIds: true },
    });

    if (!user) {
      throw new NotFoundException(`User '${userId}' not found`);
    }

    const currentFavorites = user.favoritePensionIds || [];
    if (!currentFavorites.includes(pensionId)) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        favoritePensionIds: {
          set: currentFavorites.filter((id) => id !== pensionId),
        },
      },
    });

    return { removed: true };
  }
}
