import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UniversitiesModule } from '../universities/universities.module.js';
import { CitiesController } from './cities.controller.js';
import { PensionsController } from './pensions.controller.js';
import { PensionsService } from './pensions.service.js';

@Module({
  imports: [PrismaModule, AuthModule, UniversitiesModule],
  controllers: [PensionsController, CitiesController],
  providers: [PensionsService],
  exports: [PensionsService],
})
export class PensionsModule {}
