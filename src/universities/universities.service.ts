import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateUniversityDto } from './dto/create-university.dto.js';
import type { UpdateUniversityDto } from './dto/update-university.dto.js';

export type UniversityDomainMatch = {
  id: string;
  name: string;
  shortName: string | null;
  city: string;
  address: string;
};

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailDomain(email: string): Promise<UniversityDomainMatch | null> {
    const parts = email.toLowerCase().trim().split('@');
    const fullDomain = parts.length === 2 ? parts[1] : '';
    if (!fullDomain) {
      return null;
    }

    const candidateDomains: string[] = [fullDomain];
    const domainSegments = fullDomain.split('.');
    for (let i = 1; i < domainSegments.length - 1; i++) {
      candidateDomains.push(domainSegments.slice(i).join('.'));
    }

    return this.prisma.university.findFirst({
      where: {
        deletedAt: null,
        emailDomains: { hasSome: candidateDomains },
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        city: true,
        address: true,
      },
    });
  }

  async findAll(city?: string): Promise<unknown[]> {
    const where: Prisma.UniversityWhereInput = {
      deletedAt: null,
    };

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const [universities, activePensions] = await Promise.all([
      this.prisma.university.findMany({
        where,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          shortName: true,
          emailDomains: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          _count: {
            select: {
              students: true,
            },
          },
        },
      }),
      this.prisma.pension.findMany({
        where: { deletedAt: null, isActive: true },
        select: {
          nearbyUniversities: true,
        },
      }),
    ]);

    const countMap = new Map<string, number>();
    for (const pension of activePensions ?? []) {
      if (Array.isArray(pension?.nearbyUniversities)) {
        for (const nu of pension.nearbyUniversities) {
          if (nu?.universityId) {
            countMap.set(nu.universityId, (countMap.get(nu.universityId) ?? 0) + 1);
          }
        }
      }
    }

    return universities.map((u) => ({
      ...u,
      _count: {
        students: u._count?.students ?? 0,
        nearbyPensions: countMap.get(u.id) ?? 0,
      },
    }));
  }

  async findById(id: string): Promise<unknown> {
    const university = await this.prisma.university.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        shortName: true,
        emailDomains: true,
        city: true,
        address: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            students: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundException(`University '${id}' not found`);
    }

    const [nearbyPensions, nearbyPensionsCount] = await Promise.all([
      this.prisma.pension.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          nearbyUniversities: {
            some: {
              universityId: id,
            },
          },
        },
        take: 10,
        select: {
          id: true,
          slug: true,
          title: true,
          baseMonthlyPrice: true,
          ratingAverage: true,
          ratingCount: true,
        },
      }),
      this.prisma.pension.count({
        where: {
          deletedAt: null,
          isActive: true,
          nearbyUniversities: {
            some: {
              universityId: id,
            },
          },
        },
      }),
    ]);

    return {
      ...university,
      nearbyPensions: nearbyPensions.map((pension) => ({
        ...pension,
        pension,
      })),
      _count: {
        students: university._count?.students ?? 0,
        nearbyPensions: nearbyPensionsCount,
      },
    };
  }

  async create(dto: CreateUniversityDto): Promise<unknown> {
    return this.prisma.university.create({
      data: dto,
    });
  }

  async update(id: string, dto: UpdateUniversityDto): Promise<unknown> {
    const existing = await this.prisma.university.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`University '${id}' not found`);
    }

    return this.prisma.university.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string): Promise<{ id: string; deleted: boolean }> {
    const existing = await this.prisma.university.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(`University '${id}' not found`);
    }

    await this.prisma.university.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }
}
