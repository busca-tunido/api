import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createSoftDeleteExtension } from './prisma.extension.js';

const createExtendedClient = (baseClient: PrismaClient): unknown => {
  return baseClient.$extends(createSoftDeleteExtension(() => baseClient));
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    const extended = createExtendedClient(this);
    Object.assign(this, extended);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
