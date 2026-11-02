import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { DeleteResultResponseDto } from '../pensions/dto/pension-response.dto.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { RoomResponseDto } from './dto/room-response.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@ApiTags('Rooms')
@Controller()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('pensions/:pensionId/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List rooms for a specific pension' })
  @ApiParam({ name: 'pensionId', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(RoomResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of rooms',
  })
  @ApiStandardErrors([401, 404, 500])
  async findByPension(@Param('pensionId') pensionId: string): Promise<unknown[]> {
    return this.roomsService.findByPension(pensionId);
  }

  @Get('rooms/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get room by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la habitación' })
  @ApiEnvelopeResponse(RoomResponseDto, {
    status: 200,
    description: 'Room details',
  })
  @ApiStandardErrors([401, 404, 500])
  async findOne(@Param('id') id: string): Promise<unknown> {
    return this.roomsService.findById(id);
  }

  @Post('pensions/:pensionId/rooms')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a new room to a pension (Owner or Admin)' })
  @ApiParam({ name: 'pensionId', type: String, description: 'ID de la pensión' })
  @ApiEnvelopeResponse(RoomResponseDto, {
    status: 201,
    description: 'Room created successfully',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
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
  @ApiParam({ name: 'id', type: String, description: 'ID de la habitación' })
  @ApiEnvelopeResponse(RoomResponseDto, {
    status: 200,
    description: 'Room updated successfully',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
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
  @ApiParam({ name: 'id', type: String, description: 'ID de la habitación' })
  @ApiEnvelopeResponse(DeleteResultResponseDto, {
    status: 200,
    description: 'Room deleted successfully',
  })
  @ApiStandardErrors([401, 403, 404, 500])
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    return this.roomsService.delete(id, user);
  }
}
