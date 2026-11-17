import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiEnvelopeResponse,
  ApiStandardErrors,
} from '../common/decorators/api-envelope-response.decorator.js';
import {
  CacheControl,
  CacheControlInterceptor,
} from '../common/interceptors/cache-control.interceptor.js';
import { CitySummaryResponseDto } from './dto/pension-response.dto.js';
import { type CitySummaryItem, PensionsService } from './pensions.service.js';

@ApiTags('Cities')
@Controller('cities')
export class CitiesController {
  constructor(private readonly pensionsService: PensionsService) {}

  @Get()
  @UseInterceptors(CacheControlInterceptor)
  @CacheControl(300, 1800)
  @ApiOperation({ summary: 'List all cities with absolute pension counts and coordinates' })
  @ApiEnvelopeResponse(CitySummaryResponseDto, {
    status: 200,
    isArray: true,
    description: 'List of cities with absolute pension counts',
  })
  @ApiStandardErrors([500])
  async findAll(): Promise<CitySummaryItem[]> {
    return this.pensionsService.getCitiesSummary();
  }
}
