import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { type CitySummaryItem, PensionsService } from './pensions.service.js';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly pensionsService: PensionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all cities with absolute pension counts and coordinates' })
  @ApiResponse({ status: 200, description: 'List of cities with absolute pension counts' })
  async findAll(): Promise<CitySummaryItem[]> {
    return this.pensionsService.getCitiesSummary();
  }
}
