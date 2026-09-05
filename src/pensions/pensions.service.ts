import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePensionDto } from './dto/create-pension.dto.js';
import type { FilterPensionsDto } from './dto/filter-pensions.dto.js';
import type { UpdatePensionDto } from './dto/update-pension.dto.js';

export type PaginatedPensions<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
};

@Injectable()
export class PensionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: FilterPensionsDto): Promise<PaginatedPensions<unknown>> {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(50, filter.limit || 12));
    const skip = (page - 1) * limit;

    const where: Prisma.PensionWhereInput = {
      deletedAt: null,
      isActive: true,
    };

    if (filter.city) {
      where.city = { contains: filter.city, mode: 'insensitive' };
    }

    if (filter.neighborhood) {
      where.neighborhood = { contains: filter.neighborhood, mode: 'insensitive' };
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.baseMonthlyPrice = {};
      if (filter.minPrice !== undefined) {
        where.baseMonthlyPrice.gte = filter.minPrice;
      }
      if (filter.maxPrice !== undefined) {
        where.baseMonthlyPrice.lte = filter.maxPrice;
      }
    }

    if (filter.genderPreference) {
      where.genderPreference = filter.genderPreference;
    }

    if (filter.universityId) {
      where.nearbyUniversities = {
        some: { universityId: filter.universityId },
      };
    }

    if (filter.amenities && filter.amenities.length > 0) {
      where.amenities = {
        some: { slug: { in: filter.amenities } },
      };
    }

    if (filter.search) {
      const searchTerms = [filter.search];
      if (/uchile/i.test(filter.search)) {
        searchTerms.push('Universidad de Chile');
      }
      if (/\b(uc|puc|pucch)\b/i.test(filter.search)) {
        searchTerms.push('Catolica');
      }
      if (/\b(usm|utfsm)\b/i.test(filter.search)) {
        searchTerms.push('Santa María');
      }

      where.OR = searchTerms.flatMap((term) => [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { neighborhood: { contains: term, mode: 'insensitive' } },
        { address: { contains: term, mode: 'insensitive' } },
        {
          nearbyUniversities: {
            some: {
              university: {
                OR: [
                  { name: { contains: term, mode: 'insensitive' } },
                  { shortName: { contains: term, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ]);
    }

    const [items, total] = await Promise.all([
      this.prisma.pension.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
          amenities: {
            where: { deletedAt: null },
            take: 5,
          },
          nearbyUniversities: {
            include: {
              university: {
                select: { id: true, name: true, shortName: true },
              },
            },
            take: 2,
          },
          _count: {
            select: {
              rooms: true,
              reviews: true,
            },
          },
        },
      }),
      this.prisma.pension.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findBySlugOrId(idOrSlug: string): Promise<unknown> {
    const pension = await this.prisma.pension.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        images: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        amenities: {
          where: { deletedAt: null },
        },
        rooms: {
          where: { deletedAt: null },
          orderBy: { monthlyPrice: 'asc' },
        },
        nearbyUniversities: {
          include: {
            university: true,
          },
        },
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${idOrSlug}' not found`);
    }

    return pension;
  }

  async create(dto: CreatePensionDto, landlord: SanitizedUser): Promise<unknown> {
    const rawSlug = slugify(dto.title);
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${rawSlug}-${uniqueSuffix}`;

    const { amenitySlugs, nearbyUniversityId, distanceMeters, ...pensionData } = dto;

    return this.prisma.pension.create({
      data: {
        ...pensionData,
        slug,
        landlordId: landlord.id,
        submittedById: landlord.id,
        amenities:
          amenitySlugs && amenitySlugs.length > 0
            ? {
                connect: amenitySlugs.map((s) => ({ slug: s })),
              }
            : undefined,
        nearbyUniversities: nearbyUniversityId
          ? {
              create: {
                universityId: nearbyUniversityId,
                distanceMeters: distanceMeters || 1000,
                walkingMinutes: Math.round((distanceMeters || 1000) / 80),
              },
            }
          : undefined,
      },
      include: {
        amenities: true,
        nearbyUniversities: true,
      },
    });
  }

  async update(id: string, dto: UpdatePensionDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only update your own pensions');
    }

    const { amenitySlugs, nearbyUniversityId, distanceMeters, ...pensionData } = dto;

    return this.prisma.pension.update({
      where: { id },
      data: {
        ...pensionData,
        amenities: amenitySlugs
          ? {
              set: amenitySlugs.map((s) => ({ slug: s })),
            }
          : undefined,
      },
      include: {
        amenities: true,
        images: true,
      },
    });
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const pension = await this.prisma.pension.findUnique({
      where: { id, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only delete your own pensions');
    }

    await this.prisma.pension.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }
}
