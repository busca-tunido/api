import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PensionsController } from './pensions.controller.js';
import { PensionsService } from './pensions.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PensionsController],
  providers: [PensionsService],
  exports: [PensionsService],
})
export class PensionsModule {}
