import crypto from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRoomDto } from './dto/create-room.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';

interface EmbeddedRoomData {
  id: string;
  roomNumber: string | null;
  title: string;
  description: string | null;
  type: string;
  monthlyPrice: number;
  deposit: number | null;
  hasPrivateBathroom: boolean;
  totalBeds: number;
  availableBeds: number;
  isAvailable: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPension(pensionId: string): Promise<unknown[]> {
    const pension = await this.prisma.pension.findUnique({
      where: { id: pensionId, deletedAt: null },
      select: { id: true, rooms: true },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    return (pension.rooms || [])
      .filter((room) => !room.deletedAt)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
      .map((room) => ({
        ...room,
        pensionId: pension.id,
      }));
  }

  async findById(id: string): Promise<unknown> {
    const pension = await this.prisma.pension.findFirst({
      where: {
        deletedAt: null,
        rooms: {
          some: {
            id,
            deletedAt: null,
          },
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        city: true,
        landlordId: true,
        rooms: true,
      },
    });

    if (!pension) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    const room = pension.rooms.find((r) => r.id === id && !r.deletedAt);
    if (!room) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    return {
      ...room,
      pensionId: pension.id,
      pension: {
        id: pension.id,
        title: pension.title,
        slug: pension.slug,
        city: pension.city,
        landlordId: pension.landlordId,
      },
    };
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

    const roomId = crypto.randomUUID();
    const newRoom: EmbeddedRoomData = {
      id: roomId,
      roomNumber: dto.roomNumber ?? null,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type ?? 'SINGLE',
      monthlyPrice: dto.monthlyPrice,
      deposit: dto.deposit ?? null,
      hasPrivateBathroom: dto.hasPrivateBathroom ?? false,
      totalBeds: dto.totalBeds ?? 1,
      availableBeds: dto.availableBeds ?? 1,
      isAvailable: dto.isAvailable ?? true,
      images: dto.images ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    await this.prisma.pension.update({
      where: { id: pensionId },
      data: {
        rooms: {
          push: newRoom,
        },
      },
    });

    return {
      ...newRoom,
      pensionId,
    };
  }

  async update(id: string, dto: UpdateRoomDto, user: SanitizedUser): Promise<unknown> {
    const pension = await this.prisma.pension.findFirst({
      where: {
        deletedAt: null,
        rooms: {
          some: {
            id,
            deletedAt: null,
          },
        },
      },
    });

    if (!pension) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only update rooms in your own pensions');
    }

    const roomIndex = pension.rooms.findIndex((r) => r.id === id && !r.deletedAt);
    if (roomIndex === -1) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    const existing = pension.rooms[roomIndex];
    const updatedRoom: EmbeddedRoomData = {
      ...existing,
      ...dto,
      images: dto.images ?? existing.images,
      updatedAt: new Date(),
    };

    const updatedRooms = [...pension.rooms];
    updatedRooms[roomIndex] = updatedRoom;

    await this.prisma.pension.update({
      where: { id: pension.id },
      data: {
        rooms: {
          set: updatedRooms,
        },
      },
    });

    return {
      ...updatedRoom,
      pensionId: pension.id,
    };
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const pension = await this.prisma.pension.findFirst({
      where: {
        deletedAt: null,
        rooms: {
          some: {
            id,
            deletedAt: null,
          },
        },
      },
    });

    if (!pension) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only delete rooms in your own pensions');
    }

    const roomIndex = pension.rooms.findIndex((r) => r.id === id && !r.deletedAt);
    if (roomIndex === -1) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    const updatedRooms = pension.rooms.map((r) =>
      r.id === id ? { ...r, deletedAt: new Date(), updatedAt: new Date() } : r,
    );

    await this.prisma.pension.update({
      where: { id: pension.id },
      data: {
        rooms: {
          set: updatedRooms,
        },
      },
    });

    return { id, deleted: true };
  }
}
