import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  details?: string;
}

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check API and database health' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async getHealth(): Promise<HealthCheckResponse> {
    try {
      await this.prisma.$runCommandRaw({ ping: 1 });
      return { status: 'ok', database: 'connected' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { status: 'error', database: 'disconnected', details: message };
    }
  }
}
