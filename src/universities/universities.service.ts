import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateUniversityDto } from './dto/create-university.dto.js';
import type { UpdateUniversityDto } from './dto/update-university.dto.js';

@Injectable()
export class UniversitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(city?: string): Promise<unknown[]> {
    const where: Prisma.UniversityWhereInput = {
      deletedAt: null,
    };

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    return this.prisma.university.findMany({
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
            nearbyPensions: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<unknown> {
    const university = await this.prisma.university.findUnique({
      where: { id, deletedAt: null },
      include: {
        nearbyPensions: {
          include: {
            pension: {
              select: {
                id: true,
                slug: true,
                title: true,
                baseMonthlyPrice: true,
                ratingAverage: true,
                ratingCount: true,
              },
            },
          },
          take: 10,
        },
        _count: {
          select: {
            students: true,
            nearbyPensions: true,
          },
        },
      },
    });

    if (!university) {
      throw new NotFoundException(`University '${id}' not found`);
    }

    return university;
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
