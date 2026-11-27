import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient as SqlPrismaClient } from '@prisma/sql-client';
import { env } from '../env.js';
import { createSqlSoftDeleteExtension } from './sql-prisma.extension.js';

const createExtendedSqlClient = (baseClient: SqlPrismaClient): unknown => {
  return baseClient.$extends(createSqlSoftDeleteExtension(() => baseClient));
};

@Injectable()
export class SqlPrismaService extends SqlPrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super(
      env.SQL_DATABASE_URL
        ? {
            datasources: {
              db: {
                url: env.SQL_DATABASE_URL,
              },
            },
          }
        : undefined,
    );

    const extended = createExtendedSqlClient(this);
    Object.assign(this, extended);
  }

  async onModuleInit(): Promise<void> {
    if (process.env.SKIP_DB_CONNECT === 'true' || !env.SQL_DATABASE_URL) {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.SKIP_DB_CONNECT === 'true' || !env.SQL_DATABASE_URL) {
      return;
    }
    await this.$disconnect();
  }
}
