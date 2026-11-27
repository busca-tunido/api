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
import { SqlPrismaService } from './sql-prisma/sql-prisma.service.js';

export class DatabaseStatusesDto {
  @ApiProperty({ enum: ['connected', 'disconnected'], example: 'connected' })
  mongodb!: 'connected' | 'disconnected';

  @ApiProperty({ enum: ['connected', 'disconnected'], example: 'connected' })
  postgresql!: 'connected' | 'disconnected';
}

export class HealthCheckResponseDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: 'ok' | 'error';

  @ApiProperty({ type: String, example: 'connected' })
  database!: 'connected' | 'disconnected';

  @ApiPropertyOptional({ type: String, example: 'OK' })
  details?: string;

  @ApiPropertyOptional({ type: () => DatabaseStatusesDto })
  databases?: DatabaseStatusesDto;
}

export type HealthCheckResponse = HealthCheckResponseDto;

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly sqlPrisma: SqlPrismaService,
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
    const [mongoResult, sqlResult] = await Promise.allSettled([
      this.prisma.$runCommandRaw({ ping: 1 }),
      this.sqlPrisma.$queryRaw`SELECT 1`,
    ]);

    const mongodb: 'connected' | 'disconnected' =
      mongoResult.status === 'fulfilled' ? 'connected' : 'disconnected';
    const postgresql: 'connected' | 'disconnected' =
      sqlResult.status === 'fulfilled' ? 'connected' : 'disconnected';
    const databases: DatabaseStatusesDto = { mongodb, postgresql };

    if (mongoResult.status === 'fulfilled' && sqlResult.status === 'fulfilled') {
      return { status: 'ok', database: 'connected', databases };
    }

    const errors: string[] = [];
    if (mongoResult.status === 'rejected') {
      const msg =
        mongoResult.reason instanceof Error
          ? mongoResult.reason.message
          : String(mongoResult.reason);
      errors.push(`MongoDB: ${msg}`);
    }
    if (sqlResult.status === 'rejected') {
      const msg =
        sqlResult.reason instanceof Error ? sqlResult.reason.message : String(sqlResult.reason);
      errors.push(`PostgreSQL: ${msg}`);
    }

    return {
      status: 'error',
      database: 'disconnected',
      details: errors.join('; '),
      databases,
    };
  }
}
