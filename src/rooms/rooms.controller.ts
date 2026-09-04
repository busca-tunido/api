import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('Rooms')
@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('pensions/:pensionId/rooms')
  @ApiOperation({ summary: 'List rooms for a specific pension' })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  async findByPension(@Param('pensionId') pensionId: string): Promise<unknown[]> {
    return this.roomsService.findByPension(pensionId);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiResponse({ status: 200, description: 'Room details' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async findOne(@Param('id') id: string): Promise<unknown> {
    return this.roomsService.findById(id);
  }

  @Post('pensions/:pensionId/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new room to a pension (Owner or Admin)' })
  @ApiResponse({ status: 201, description: 'Room created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this pension' })
  async create(
    @Param('pensionId') pensionId: string,
    @Body() dto: CreateRoomDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.roomsService.create(pensionId, dto, user);
  }

  @Patch('rooms/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update room details (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Room updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.roomsService.update(id, dto, user);
  }

  @Delete('rooms/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete room (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Room deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    return this.roomsService.delete(id, user);
  }
}
