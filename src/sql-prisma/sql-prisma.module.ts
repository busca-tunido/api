import { Global, Module } from '@nestjs/common';
import { SqlPrismaService } from './sql-prisma.service.js';

@Global()
@Module({
  providers: [SqlPrismaService],
  exports: [SqlPrismaService],
})
export class SqlPrismaModule {}
