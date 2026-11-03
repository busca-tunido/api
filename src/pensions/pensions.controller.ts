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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { CreatePensionDto } from './dto/create-pension.dto.js';
import { FilterPensionsDto } from './dto/filter-pensions.dto.js';
import {
  CitySummaryResponseDto,
  DeleteResultResponseDto,
  PaginatedPensionsResponseDto,
  PensionItemResponseDto,
  PriceHistogramResponseDto,
} from './dto/pension-response.dto.js';
import { UpdatePensionDto } from './dto/update-pension.dto.js';
import {
  type CitySummaryItem,
  type PaginatedPensions,
  PensionsService,
  type PriceHistogram,
} from './pensions.service.js';

@ApiTags('Pensions')
@Controller('pensions')
export class PensionsController {
  constructor(private readonly pensionsService: PensionsService) {}

  @Get()
  @ApiOperation({ summary: 'List pensions with filtering and pagination' })
  @ApiEnvelopeResponse(PaginatedPensionsResponseDto, {
    status: 200,
    description: 'Paginated list of pensions',
  })
  @ApiStandardErrors([400, 500])
  async findAll(@Query() filter: FilterPensionsDto): Promise<PaginatedPensions<unknown>> {
    return this.pensionsService.findAll(filter);
  }

  @Get('price-histogram')
  @ApiOperation({ summary: 'Get price distribution histogram for pensions' })
  @ApiEnvelopeResponse(PriceHistogramResponseDto, {
    status: 200,
    description: 'Price distribution histogram with 28 bins',
  })
  @ApiStandardErrors([400, 500])
  async getPriceHistogram(@Query() query: FilterPensionsDto): Promise<PriceHistogram> {
    return this.pensionsService.getPriceHistogram(query);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List pensions owned by authenticated landlord' })
  @ApiEnvelopeResponse(PensionItemResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of pensions owned by landlord',
  })
  @ApiStandardErrors([401, 403, 500])
  async getMine(@CurrentUser('id') userId: string): Promise<unknown> {
    return this.pensionsService.findMine(userId);
  }

  @Get('cities')
  @ApiOperation({ summary: 'List all cities with absolute pension counts and coordinates' })
  @ApiEnvelopeResponse(CitySummaryResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of cities with absolute pension counts',
  })
  @ApiStandardErrors([500])
  async getCities(): Promise<CitySummaryItem[]> {
    return this.pensionsService.getCitiesSummary();
  }

  @Get(':idOrSlug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get pension detail by ID or Slug' })
  @ApiParam({ name: 'idOrSlug', type: String, description: 'Pension ID or friendly URL slug' })
  @ApiEnvelopeResponse(PensionItemResponseDto, {
    status: 200,
    description: 'Pension detailed information',
  })
  @ApiStandardErrors([404, 500])
  async findOne(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user?: SanitizedUser,
  ): Promise<unknown> {
    return this.pensionsService.findBySlugOrId(idOrSlug, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.LANDLORD, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new pension (Landlord or Admin)' })
  @ApiEnvelopeResponse(PensionItemResponseDto, {
    status: 201,
    description: 'Pension created successfully',
  })
  @ApiStandardErrors([400, 401, 403, 500])
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
  @ApiParam({ name: 'id', type: String, description: 'Pension ID' })
  @ApiEnvelopeResponse(PensionItemResponseDto, {
    status: 200,
    description: 'Pension updated successfully',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
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
  @ApiParam({ name: 'id', type: String, description: 'Pension ID' })
  @ApiEnvelopeResponse(DeleteResultResponseDto, {
    status: 200,
    description: 'Pension deleted successfully',
  })
  @ApiStandardErrors([401, 403, 404, 500])
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: SanitizedUser,
  ): Promise<{ id: string; deleted: boolean }> {
    return this.pensionsService.delete(id, user);
  }
}
