import crypto from 'node:crypto';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/sql-client';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { isValidObjectId } from '../common/utils/string.util.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateRoomDto } from './dto/create-room.dto.js';
import { BathType } from './dto/room-response.dto.js';
import type { UpdateRoomDto } from './dto/update-room.dto.js';

type EmbeddedRoomData = {
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
  isActive: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function formatRoomResponse(room: EmbeddedRoomData, pensionId: string) {
  return {
    ...room,
    pensionId,
    name: room.title,
    priceMonthlyClp: room.monthlyPrice,
    bathType: room.hasPrivateBathroom ? BathType.PRIVATE : BathType.SHARED,
  };
}

function getMinAvailableRoomPrice(rooms: EmbeddedRoomData[]): number | undefined {
  let min: number | undefined;
  for (const r of rooms) {
    if (!r.deletedAt && r.isAvailable && r.isActive !== false) {
      if (min === undefined || r.monthlyPrice < min) {
        min = r.monthlyPrice;
      }
    }
  }
  return min;
}

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findPensionAndRoomForMutation(
    id: string,
    user: SanitizedUser,
    actionVerb: 'update' | 'delete',
  ) {
    const pension = await this.prisma.pension.findFirst({
      where: {
        rooms: {
          some: { id },
        },
      },
    });

    if (!pension) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException(`You can only ${actionVerb} rooms in your own pensions`);
    }

    const roomIndex = pension.rooms.findIndex((r) => r.id === id && !r.deletedAt);
    if (roomIndex === -1) {
      throw new NotFoundException(`Room '${id}' not found`);
    }

    return { pension, roomIndex };
  }

  async findByPension(pensionId: string): Promise<unknown[]> {
    const isObjectId = isValidObjectId(pensionId);
    const pension = await this.prisma.pension.findFirst({
      where: isObjectId ? { OR: [{ id: pensionId }, { slug: pensionId }] } : { slug: pensionId },
      select: { id: true, rooms: true },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    return (pension.rooms || [])
      .filter((room) => !room.deletedAt)
      .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
      .map((room) => formatRoomResponse(room, pension.id));
  }

  async findById(id: string): Promise<unknown> {
    const pension = await this.prisma.pension.findFirst({
      where: {
        rooms: {
          some: { id },
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
      ...formatRoomResponse(room, pension.id),
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
    const isObjectId = isValidObjectId(pensionId);
    const pension = await this.prisma.pension.findFirst({
      where: isObjectId ? { OR: [{ id: pensionId }, { slug: pensionId }] } : { slug: pensionId },
    });

    if (!pension) {
      throw new NotFoundException(`Pension '${pensionId}' not found`);
    }

    if (user.role !== Role.ADMIN && pension.landlordId !== user.id) {
      throw new ForbiddenException('You can only create rooms for your own pensions');
    }

    const hasPrivateBathroom =
      dto.bathType !== undefined
        ? dto.bathType === BathType.PRIVATE
        : (dto.hasPrivateBathroom ?? false);

    const newRoom: EmbeddedRoomData = {
      id: crypto.randomUUID(),
      roomNumber: dto.roomNumber ?? null,
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type ?? 'SINGLE',
      monthlyPrice: dto.monthlyPrice,
      deposit: dto.deposit ?? null,
      hasPrivateBathroom,
      totalBeds: dto.totalBeds ?? 1,
      availableBeds: dto.availableBeds ?? 1,
      isAvailable: dto.isAvailable ?? true,
      isActive: dto.isActive ?? true,
      images: dto.images ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const allRooms = [...(pension.rooms || []), newRoom];
    const minMonthlyPrice = getMinAvailableRoomPrice(allRooms);

    await this.prisma.pension.update({
      where: { id: pension.id },
      data: {
        rooms: { push: newRoom },
        ...(minMonthlyPrice !== undefined ? { baseMonthlyPrice: minMonthlyPrice } : {}),
      },
    });

    return formatRoomResponse(newRoom, pension.id);
  }

  async update(id: string, dto: UpdateRoomDto, user: SanitizedUser): Promise<unknown> {
    const { pension, roomIndex } = await this.findPensionAndRoomForMutation(id, user, 'update');

    const existing = pension.rooms[roomIndex];
    const hasPrivateBathroom =
      dto.bathType !== undefined
        ? dto.bathType === BathType.PRIVATE
        : (dto.hasPrivateBathroom ?? existing.hasPrivateBathroom);

    const updatedRoom: EmbeddedRoomData = {
      ...existing,
      ...dto,
      hasPrivateBathroom,
      images: dto.images ?? existing.images,
      updatedAt: new Date(),
    };

    const updatedRooms = [...pension.rooms];
    updatedRooms[roomIndex] = updatedRoom;

    const minMonthlyPrice = getMinAvailableRoomPrice(updatedRooms);

    await this.prisma.pension.update({
      where: { id: pension.id },
      data: {
        rooms: { set: updatedRooms },
        ...(minMonthlyPrice !== undefined ? { baseMonthlyPrice: minMonthlyPrice } : {}),
      },
    });

    return formatRoomResponse(updatedRoom, pension.id);
  }

  async delete(id: string, user: SanitizedUser): Promise<{ id: string; deleted: boolean }> {
    const { pension } = await this.findPensionAndRoomForMutation(id, user, 'delete');

    const updatedRooms = pension.rooms.map((r) =>
      r.id === id ? { ...r, deletedAt: new Date(), updatedAt: new Date() } : r,
    );

    const minMonthlyPrice = getMinAvailableRoomPrice(updatedRooms);

    await this.prisma.pension.update({
      where: { id: pension.id },
      data: {
        rooms: { set: updatedRooms },
        ...(minMonthlyPrice !== undefined ? { baseMonthlyPrice: minMonthlyPrice } : {}),
      },
    });

    return { id, deleted: true };
  }
}
