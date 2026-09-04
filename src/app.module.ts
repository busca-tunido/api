import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { validateEnv } from './common/config/env.validation.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { PensionsModule } from './pensions/pensions.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { RoomsModule } from './rooms/rooms.module.js';
import { UniversitiesModule } from './universities/universities.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    PensionsModule,
    RoomsModule,
    UniversitiesModule,
    ReviewsModule,
    ReportsModule,
    FavoritesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
