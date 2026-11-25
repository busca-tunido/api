import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';
import { UploadsRateLimitService } from './uploads-rate-limit.service.js';

@Module({
  imports: [StorageModule],
  controllers: [UploadsController],
  providers: [UploadsService, UploadsRateLimitService],
  exports: [UploadsService],
})
export class UploadsModule {}
