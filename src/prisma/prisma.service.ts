import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createSoftDeleteExtension } from './prisma.extension.js';

type ExtendedClient = ReturnType<typeof createExtendedClient>;

const createExtendedClient = (baseClient: PrismaClient): unknown => {
  return baseClient.$extends(createSoftDeleteExtension(() => baseClient));
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly extendedClient: ExtendedClient;

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tunido_dev';
    const pool = new Pool({
      connectionString,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;

    const extended = createExtendedClient(this);
    this.extendedClient = extended;

    return new Proxy(this, {
      get: (target: PrismaService, prop: string | symbol, receiver: unknown): unknown => {
        if (
          prop === 'onModuleInit' ||
          prop === 'onModuleDestroy' ||
          prop === 'pool' ||
          prop === '$connect' ||
          prop === '$disconnect'
        ) {
          return Reflect.get(target, prop, receiver);
        }
        if (target.extendedClient && prop in (target.extendedClient as object)) {
          return Reflect.get(target.extendedClient as object, prop);
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }
}
