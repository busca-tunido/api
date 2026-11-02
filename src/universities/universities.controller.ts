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
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import {
  CacheControl,
  CacheControlInterceptor,
} from '../common/interceptors/cache-control.interceptor.js';
import { DeleteResultResponseDto } from '../pensions/dto/pension-response.dto.js';
import { CampusAreaResponseDto } from './dto/campus-area.dto.js';
import { CreateUniversityDto } from './dto/create-university.dto.js';
import { UniversityResponseDto } from './dto/university-response.dto.js';
import { UpdateUniversityDto } from './dto/update-university.dto.js';
import { UniversitiesService } from './universities.service.js';

@ApiTags('Universities')
@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl(3600, 86400)
  @ApiOperation({ summary: 'List all universities with optional city filter' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiEnvelopeResponse(UniversityResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of universities',
  })
  @ApiStandardErrors([500])
  async findAll(@Query('city') city?: string): Promise<unknown[]> {
    return this.universitiesService.findAll(city);
  }

  @Get('campuses')
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl(3600, 86400)
  @ApiOperation({ summary: 'List all university campus areas with perimeter polygons' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiEnvelopeResponse(CampusAreaResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of campus areas with polygons',
  })
  @ApiStandardErrors([500])
  async findCampusAreas(@Query('city') city?: string): Promise<CampusAreaResponseDto[]> {
    return this.universitiesService.findCampusAreas(city);
  }

  @Get(':id')
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl(3600, 86400)
  @ApiOperation({ summary: 'Get university by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la universidad' })
  @ApiEnvelopeResponse(UniversityResponseDto, {
    status: 200,
    description: 'University details',
  })
  @ApiStandardErrors([404, 500])
  async findOne(@Param('id') id: string): Promise<unknown> {
    return this.universitiesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new university (Admin only)' })
  @ApiEnvelopeResponse(UniversityResponseDto, {
    status: 201,
    description: 'University created',
  })
  @ApiStandardErrors([400, 401, 403, 500])
  async create(@Body() dto: CreateUniversityDto): Promise<unknown> {
    return this.universitiesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update university (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la universidad' })
  @ApiEnvelopeResponse(UniversityResponseDto, {
    status: 200,
    description: 'University updated',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
  async update(@Param('id') id: string, @Body() dto: UpdateUniversityDto): Promise<unknown> {
    return this.universitiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete university (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'ID de la universidad' })
  @ApiEnvelopeResponse(DeleteResultResponseDto, {
    status: 200,
    description: 'University deleted',
  })
  @ApiStandardErrors([401, 403, 404, 500])
  async delete(@Param('id') id: string): Promise<{ id: string; deleted: boolean }> {
    return this.universitiesService.delete(id);
  }
}
