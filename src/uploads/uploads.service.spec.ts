import { S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadsService, type UploadsStorageConfig } from './uploads.service.js';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    service = new UploadsService({ endpoint: null });
  });

  describe('processImage - local fallback mode', () => {
    it('should convert a valid PNG image to WebP with responsive variants and local path', async () => {
      const samplePng = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 0, g: 128, b: 255 },
        },
      })
        .png()
        .toBuffer();

      const result = await service.processImage(samplePng, 'test-room.png');

      expect(service.isRemoteStorageEnabled()).toBe(false);
      expect(result.format).toBe('webp');
      expect(result.url).toMatch(/^\/uploads\/(dev|test|prod)\/pensions\/[a-f0-9-]+\.webp$/);
      expect(result.thumbnailUrl).toMatch(
        /^\/uploads\/(dev|test|prod)\/pensions\/[a-f0-9-]+-thumb\.webp$/,
      );
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
      expect(result.size).toBeGreaterThan(0);
    });

    it('should throw BadRequestException if buffer is empty', async () => {
      await expect(service.processImage(Buffer.from([]))).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if buffer is not a valid image', async () => {
      const invalidData = Buffer.from('hello world not an image');
      await expect(service.processImage(invalidData)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if file exceeds 8MB', async () => {
      const largeBuffer = Buffer.alloc(8 * 1024 * 1024 + 1);
      await expect(service.processImage(largeBuffer)).rejects.toThrow(BadRequestException);
    });
  });

  describe('processImage - Neon S3 storage mode', () => {
    it('should upload to S3 and return absolute public URLs', async () => {
      const storageConfig: UploadsStorageConfig = {
        endpoint: 'https://br-sample.storage.c-2.us-east-2.aws.neon.tech',
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
        region: 'us-east-2',
        bucketName: 'uploads',
      };

      const s3Service = new UploadsService(storageConfig);
      expect(s3Service.isRemoteStorageEnabled()).toBe(true);

      const sendSpy = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

      const samplePng = await sharp({
        create: {
          width: 60,
          height: 60,
          channels: 3,
          background: { r: 10, g: 200, b: 50 },
        },
      })
        .png()
        .toBuffer();

      const result = await s3Service.processImage(samplePng, 'photo.png');

      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(result.format).toBe('webp');
      expect(result.url).toMatch(
        /^https:\/\/br-sample\.storage\.c-2\.us-east-2\.aws\.neon\.tech\/uploads\/(dev|test|prod)\/pensions\/[a-f0-9-]+\.webp$/,
      );
      expect(result.thumbnailUrl).toMatch(
        /^https:\/\/br-sample\.storage\.c-2\.us-east-2\.aws\.neon\.tech\/uploads\/(dev|test|prod)\/pensions\/[a-f0-9-]+-thumb\.webp$/,
      );

      sendSpy.mockRestore();
    });

    it('should throw InternalServerErrorException if S3 upload fails', async () => {
      const storageConfig: UploadsStorageConfig = {
        endpoint: 'https://br-sample.storage.c-2.us-east-2.aws.neon.tech',
        bucketName: 'uploads',
      };

      const s3Service = new UploadsService(storageConfig);

      const sendSpy = vi
        .spyOn(S3Client.prototype, 'send')
        .mockRejectedValue(new Error('S3 connection error'));

      const samplePng = await sharp({
        create: {
          width: 10,
          height: 10,
          channels: 3,
          background: { r: 0, g: 0, b: 0 },
        },
      })
        .png()
        .toBuffer();

      await expect(s3Service.processImage(samplePng)).rejects.toThrow(InternalServerErrorException);

      sendSpy.mockRestore();
    });
  });
});
