import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportStatus, Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { SanitizedUser } from '../auth/types/auth.types.js';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ReportResponseDto } from './dto/report-response.dto.js';
import { UpdateReportDto } from './dto/update-report.dto.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all reports (Admin and Moderator only)' })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  @ApiEnvelopeResponse(ReportResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of reports',
  })
  @ApiStandardErrors([401, 403, 500])
  async findAll(@Query('status') status?: ReportStatus): Promise<unknown[]> {
    return this.reportsService.findAll(status);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an infraction report for a pension' })
  @ApiEnvelopeResponse(ReportResponseDto, {
    status: 201,
    description: 'Report submitted successfully',
  })
  @ApiStandardErrors([400, 401, 404, 500])
  async create(@Body() dto: CreateReportDto, @CurrentUser() user: SanitizedUser): Promise<unknown> {
    return this.reportsService.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update report resolution status (Admin or Moderator only)' })
  @ApiParam({ name: 'id', type: String, description: 'ID del reporte' })
  @ApiEnvelopeResponse(ReportResponseDto, {
    status: 200,
    description: 'Report status updated',
  })
  @ApiStandardErrors([400, 401, 403, 404, 500])
  async update(@Param('id') id: string, @Body() dto: UpdateReportDto): Promise<unknown> {
    return this.reportsService.update(id, dto);
  }
}
