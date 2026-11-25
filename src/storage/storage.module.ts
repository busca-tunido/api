import { Module } from '@nestjs/common';
import { OBJECT_STORAGE_PORT } from './object-storage.port.js';
import { S3StorageAdapter } from './s3-storage.adapter.js';

@Module({
  providers: [
    S3StorageAdapter,
    {
      provide: OBJECT_STORAGE_PORT,
      useExisting: S3StorageAdapter,
    },
  ],
  exports: [OBJECT_STORAGE_PORT, S3StorageAdapter],
})
export class StorageModule {}
