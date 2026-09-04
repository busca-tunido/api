import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { createSoftDeleteExtension } from './prisma.extension.js';

const createExtendedClient = (baseClient: PrismaClient): unknown => {
  return baseClient.$extends(createSoftDeleteExtension(() => baseClient));
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tunido_dev';
    const pool = new Pool({
      connectionString,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;

    const extended = createExtendedClient(this);
    Object.assign(this, extended);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
