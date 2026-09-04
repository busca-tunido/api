import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import { CreatePensionDto } from './dto/create-pension.dto.js';
import { FilterPensionsDto } from './dto/filter-pensions.dto.js';
import { UpdatePensionDto } from './dto/update-pension.dto.js';
import { type PaginatedPensions, PensionsService } from './pensions.service.js';

@ApiTags('Pensions')
@Controller('pensions')
export class PensionsController {
  constructor(private readonly pensionsService: PensionsService) {}

  @Get()
  @ApiOperation({ summary: 'List pensions with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of pensions' })
  async findAll(@Query() filter: FilterPensionsDto): Promise<PaginatedPensions<unknown>> {
    return this.pensionsService.findAll(filter);
  }

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get pension detail by ID or Slug' })
  @ApiResponse({ status: 200, description: 'Pension detailed information' })
  @ApiResponse({ status: 404, description: 'Pension not found' })
  async findOne(@Param('idOrSlug') idOrSlug: string): Promise<unknown> {
    return this.pensionsService.findBySlugOrId(idOrSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new pension (Landlord or Admin)' })
  @ApiResponse({ status: 201, description: 'Pension created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(
    @Body() dto: CreatePensionDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.pensionsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pension details (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Pension updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this pension' })
  @ApiResponse({ status: 404, description: 'Pension not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePensionDto,
    @CurrentUser() user: SanitizedUser,
  ): Promise<unknown> {
    return this.pensionsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete pension (Owner or Admin)' })
  @ApiResponse({ status: 200, description: 'Pension deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - You do not own this pension' })
  @ApiResponse({ status: 404, description: 'Pension not found' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    return this.pensionsService.delete(id, user);
  }
}
