import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import {
  CacheControl,
  CacheControlInterceptor,
} from '../common/interceptors/cache-control.interceptor.js';
import { CreateUniversityDto } from './dto/create-university.dto.js';
import { UpdateUniversityDto } from './dto/update-university.dto.js';
import { UniversitiesService } from './universities.service.js';

@ApiTags('Universities')
@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl(3600, 86400)
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'List all universities with optional city filter' })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of universities' })
  async findAll(@Query('city') city?: string): Promise<unknown[]> {
    return this.universitiesService.findAll(city);
  }

  @Get(':id')
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl(3600, 86400)
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  @ApiOperation({ summary: 'Get university by ID' })
  @ApiResponse({ status: 200, description: 'University details' })
  @ApiResponse({ status: 404, description: 'University not found' })
  async findOne(@Param('id') id: string): Promise<unknown> {
    return this.universitiesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new university (Admin only)' })
  @ApiResponse({ status: 201, description: 'University created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateUniversityDto): Promise<unknown> {
    return this.universitiesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update university (Admin only)' })
  @ApiResponse({ status: 200, description: 'University updated' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() dto: UpdateUniversityDto): Promise<unknown> {
    return this.universitiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete university (Admin only)' })
  @ApiResponse({ status: 200, description: 'University deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async delete(@Param('id') id: string): Promise<{ id: string; deleted: boolean }> {
    return this.universitiesService.delete(id);
  }
}
