import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import { UploadsService } from './uploads.service.js';

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    service = new UploadsService();
  });

  describe('processImage', () => {
    it('should convert a valid PNG image to WebP with responsive variants', async () => {
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

      expect(result.format).toBe('webp');
      expect(result.url).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
      expect(result.thumbnailUrl).toMatch(/^\/uploads\/[a-f0-9-]+-thumb\.webp$/);
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
});
