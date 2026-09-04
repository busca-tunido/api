import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string): Promise<unknown[]> {
    return this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        pension: {
          select: {
            id: true,
            slug: true,
            title: true,
            city: true,
            neighborhood: true,
            baseMonthlyPrice: true,
            ratingAverage: true,
            ratingCount: true,
            images: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
  }

  async addFavorite(userId: string, pensionId: string): Promise<{ added: boolean }> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_pensionId: {
          userId,
          pensionId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Pension is already saved in favorites');
    }

    await this.prisma.favorite.create({
      data: {
        userId,
        pensionId,
      },
    });

    return { added: true };
  }

  async removeFavorite(userId: string, pensionId: string): Promise<{ removed: boolean }> {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_pensionId: {
          userId,
          pensionId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
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
