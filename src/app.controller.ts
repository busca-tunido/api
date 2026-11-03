import { Controller, Get } from '@nestjs/common';
import {
  ApiOperation,
  ApiProduces,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { ApiEnvelopeResponse } from './common/decorators/api-envelope-response.decorator.js';
import { PrismaService } from './prisma/prisma.service.js';

export class HealthCheckResponseDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: 'ok' | 'error';

  @ApiProperty({ type: String, example: 'connected' })
  database!: 'connected' | 'disconnected';

  @ApiPropertyOptional({ type: String, example: 'OK' })
  details?: string;
}

export type HealthCheckResponse = HealthCheckResponseDto;

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'API welcome root endpoint' })
  @ApiProduces('text/plain')
  @ApiResponse({
    status: 200,
    description: 'Welcome message',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiEnvelopeResponse(HealthCheckResponseDto, { status: 200, description: 'Health check result' })
  async getHealth(): Promise<HealthCheckResponseDto> {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return { status: 'ok', database: 'connected' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'error', database: 'disconnected', details: message };
    }
  }
}
