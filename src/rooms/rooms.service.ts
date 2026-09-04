import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRoomDto } from './dto/create-room.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPension(pensionId: string): Promise<unknown[]> {
    return this.prisma.room.findMany({
      where: {
        pensionId,
        deletedAt: null,
      },
      orderBy: { monthlyPrice: 'asc' },
    });
  }

  async findById(id: string): Promise<unknown> {
    const room = await this.prisma.room.findUnique({
      where: { id, deletedAt: null },
      include: {
        pension: {
          select: {
            id: true,
            title: true,
            slug: true,
            city: true,
            landlordId: true,
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    return room;
  }

  async create(pensionId: string, dto: CreateRoomDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only create rooms for your own pensions');
    }

    return this.prisma.room.create({
      data: {
        ...dto,
        pensionId,
      },
    });
  }

  async update(id: string, dto: UpdateRoomDto, user: SanitizedUser): Promise<unknown> {
    const room = await this.prisma.room.findUnique({
      where: { id, deletedAt: null },
      include: { pension: true },
    });

    if (!room) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && room.pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only update rooms in your own pensions');
    }

    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const room = await this.prisma.room.findUnique({
      where: { id, deletedAt: null },
      include: { pension: true },
    });

    if (!room) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && room.pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only delete rooms in your own pensions');
    }

    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { id, deleted: true };
  }
}
