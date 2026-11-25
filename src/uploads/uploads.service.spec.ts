import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObjectStoragePort } from '../storage/object-storage.port.js';
import {
  IMMUTABLE_CACHE_CONTROL,
  isValidWebpMagicBytes,
  UploadsService,
  type UploadsStorageConfig,
} from './uploads.service.js';

const VALID_WEBP_HEADER = new Uint8Array([
  0x52,
  0x49,
  0x46,
  0x46, // RIFF
  0x24,
  0x00,
  0x00,
  0x00, // size
  0x57,
  0x45,
  0x42,
  0x50, // WEBP
]);

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    service = new UploadsService({ endpoint: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isValidWebpMagicBytes', () => {
    it('accepts genuine RIFF....WEBP 12-byte header and rejects spoofed bytes', () => {
      expect(isValidWebpMagicBytes(VALID_WEBP_HEADER)).toBe(true);
      expect(isValidWebpMagicBytes(new Uint8Array(Buffer.from('<html>not webp</html>')))).toBe(
        false,
      );
      expect(isValidWebpMagicBytes(new Uint8Array([0x52, 0x49, 0x46, 0x46]))).toBe(false);
      expect(isValidWebpMagicBytes(null)).toBe(false);
    });
  });

  describe('createPresignedUpload & verifyUploadedImage (ObjectStoragePort)', () => {
    const createMockStorage = (): ObjectStoragePort => ({
      isConfigured: vi.fn(() => true),
      getPublicUrl: vi.fn((key: string) => `https://media.buscatunido.cl/${key}`),
      uploadObject: vi.fn(async ({ key }) => ({
        key,
        publicUrl: `https://media.buscatunido.cl/${key}`,
      })),
      createPresignedPutUrl: vi.fn(
        async ({ key, contentType, cacheControl, expiresInSeconds }) => ({
          key,
          uploadUrl: `https://r2.example.com/signed/${key}`,
          publicUrl: `https://media.buscatunido.cl/${key}`,
          headers: { 'Content-Type': contentType, 'Cache-Control': cacheControl },
          expiresInSeconds: expiresInSeconds ?? 120,
        }),
      ),
      readObjectHeaderBytes: vi.fn(async () => VALID_WEBP_HEADER),
      deleteObject: vi.fn(async () => {}),
    });

    it('generates paired primary + thumbnail presigned PUT URLs sharing the same UUID', async () => {
      const storage = createMockStorage();
      const uploadsService = new UploadsService(storage);

      const res = await uploadsService.createPresignedUpload({
        contentType: 'image/webp',
        primarySizeBytes: 180_000,
        thumbnailSizeBytes: 28_000,
        width: 1600,
        height: 1067,
      });

      expect(res.expiresInSeconds).toBe(120);
      expect(res.primary.key).toMatch(
        new RegExp(`^v1/(local|staging|production)/pensions/${res.fileId}\\.webp$`),
      );
      expect(res.thumbnail.key).toMatch(
        new RegExp(`^v1/(local|staging|production)/pensions/${res.fileId}-thumb\\.webp$`),
      );
      expect(storage.createPresignedPutUrl).toHaveBeenCalledTimes(2);
      expect(storage.createPresignedPutUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          contentType: 'image/webp',
          contentLength: 180_000,
          cacheControl: IMMUTABLE_CACHE_CONTROL,
        }),
      );
    });

    it('rejects non-webp MIME types or oversized presign requests', async () => {
      const storage = createMockStorage();
      const uploadsService = new UploadsService(storage);

      await expect(
        uploadsService.createPresignedUpload({
          contentType: 'image/jpeg' as unknown as 'image/webp',
          primarySizeBytes: 100_000,
          thumbnailSizeBytes: 20_000,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        uploadsService.createPresignedUpload({
          contentType: 'image/webp',
          primarySizeBytes: 3 * 1024 * 1024,
          thumbnailSizeBytes: 20_000,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        uploadsService.createPresignedUpload({
          contentType: 'image/webp',
          primarySizeBytes: 100_000,
          thumbnailSizeBytes: 500 * 1024,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('verifies both WebP objects by reading their 12-byte headers and returns public URLs', async () => {
      const storage = createMockStorage();
      const uploadsService = new UploadsService(storage);
      const fileId = '550e8400-e29b-41d4-a716-446655440000';

      const verified = await uploadsService.verifyUploadedImage({
        fileId,
        width: 1600,
        height: 1067,
        size: 180_000,
      });

      expect(storage.readObjectHeaderBytes).toHaveBeenCalledTimes(2);
      expect(storage.deleteObject).not.toHaveBeenCalled();
      expect(verified.format).toBe('webp');
      expect(verified.url).toContain(`${fileId}.webp`);
      expect(verified.thumbnailUrl).toContain(`${fileId}-thumb.webp`);
      expect(verified.width).toBe(1600);
      expect(verified.size).toBe(180_000);
    });

    it('deletes both uploaded objects and throws BadRequestException if magic bytes are spoofed', async () => {
      const storage = createMockStorage();
      vi.mocked(storage.readObjectHeaderBytes)
        .mockResolvedValueOnce(new Uint8Array(Buffer.from('<script>alert(1)</script>')))
        .mockResolvedValueOnce(VALID_WEBP_HEADER);
      const uploadsService = new UploadsService(storage);
      const fileId = '550e8400-e29b-41d4-a716-446655440000';

      await expect(uploadsService.verifyUploadedImage({ fileId })).rejects.toThrow(
        BadRequestException,
      );
      expect(storage.deleteObject).toHaveBeenCalledTimes(2);
    });
  });

  describe('processImage - storage not configured', () => {
    it('should throw InternalServerErrorException if storage client is disabled', async () => {
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

      expect(service.isRemoteStorageEnabled()).toBe(false);
      await expect(service.processImage(samplePng, 'test-room.png')).rejects.toThrow(
        InternalServerErrorException,
      );
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

  describe('processImage - S3 / R2 fallback storage mode', () => {
    it('should upload to S3 with immutable cache-control and return absolute public URLs with v1 path', async () => {
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
      const firstCommand = sendSpy.mock.calls[0]?.[0] as PutObjectCommand;
      const secondCommand = sendSpy.mock.calls[1]?.[0] as PutObjectCommand;
      expect(firstCommand).toBeInstanceOf(PutObjectCommand);
      expect(firstCommand.input.CacheControl).toBe('public, max-age=31536000, immutable');
      expect(secondCommand).toBeInstanceOf(PutObjectCommand);
      expect(secondCommand.input.CacheControl).toBe('public, max-age=31536000, immutable');

      expect(result.format).toBe('webp');
      expect(result.url).toMatch(
        /^https:\/\/br-sample\.storage\.c-2\.us-east-2\.aws\.neon\.tech\/uploads\/v1\/(local|staging|production)\/pensions\/[a-f0-9-]+\.webp$/,
      );
      expect(result.thumbnailUrl).toMatch(
        /^https:\/\/br-sample\.storage\.c-2\.us-east-2\.aws\.neon\.tech\/uploads\/v1\/(local|staging|production)\/pensions\/[a-f0-9-]+-thumb\.webp$/,
      );
    });

    it('should throw InternalServerErrorException if S3 upload fails', async () => {
      const storageConfig: UploadsStorageConfig = {
        endpoint: 'https://br-sample.storage.c-2.us-east-2.aws.neon.tech',
        bucketName: 'uploads',
      };

      const s3Service = new UploadsService(storageConfig);

      vi.spyOn(S3Client.prototype, 'send').mockRejectedValue(new Error('S3 connection error'));

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
    });
  });
});
