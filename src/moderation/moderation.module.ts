import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { ModerationController } from './moderation.controller.js';
import { ModerationService } from './moderation.service.js';

@Module({
  imports: [PrismaModule, ReviewsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
