import { HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { UploadsController } from './uploads.controller.js';
import type { UploadsService } from './uploads.service.js';
import { UploadsRateLimitService } from './uploads-rate-limit.service.js';

describe('UploadsController', () => {
  const createMockService = () =>
    ({
      createPresignedUpload: vi.fn(async () => ({
        fileId: '550e8400-e29b-41d4-a716-446655440000',
        primary: {
          key: 'v1/staging/pensions/550e8400-e29b-41d4-a716-446655440000.webp',
          uploadUrl: 'https://r2.example.com/primary',
          publicUrl: 'https://media.buscatunido.cl/primary.webp',
          headers: { 'Content-Type': 'image/webp' },
        },
        thumbnail: {
          key: 'v1/staging/pensions/550e8400-e29b-41d4-a716-446655440000-thumb.webp',
          uploadUrl: 'https://r2.example.com/thumb',
          publicUrl: 'https://media.buscatunido.cl/thumb.webp',
          headers: { 'Content-Type': 'image/webp' },
        },
        expiresInSeconds: 120,
      })),
      verifyUploadedImage: vi.fn(async () => ({
        url: 'https://media.buscatunido.cl/primary.webp',
        thumbnailUrl: 'https://media.buscatunido.cl/thumb.webp',
        width: 1600,
        height: 1000,
        format: 'webp' as const,
        size: 180_000,
      })),
      processImage: vi.fn(async () => ({
        url: 'https://media.buscatunido.cl/primary.webp',
        thumbnailUrl: 'https://media.buscatunido.cl/thumb.webp',
        width: 1600,
        height: 1000,
        format: 'webp' as const,
        size: 180_000,
      })),
    }) as unknown as UploadsService;

  it('delegates presignUpload and verifyUpload to UploadsService', async () => {
    const uploadsService = createMockService();
    const controller = new UploadsController(uploadsService, new UploadsRateLimitService());

    const presignRes = await controller.presignUpload({
      contentType: 'image/webp',
      primarySizeBytes: 180_000,
      thumbnailSizeBytes: 25_000,
    });
    expect(presignRes.fileId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(uploadsService.createPresignedUpload).toHaveBeenCalledTimes(1);

    const verifyRes = await controller.verifyUpload({
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      width: 1600,
      height: 1000,
      size: 180_000,
    });
    expect(verifyRes.format).toBe('webp');
    expect(uploadsService.verifyUploadedImage).toHaveBeenCalledTimes(1);
  });

  it('enforces per-user rate limit on fallback multipart POST /uploads/images', async () => {
    const uploadsService = createMockService();
    const rateLimit = new UploadsRateLimitService();
    const controller = new UploadsController(uploadsService, rateLimit);

    const fakeReq = {
      ip: '127.0.0.1',
      user: { id: 'user-rate-test' },
      file: async () => ({
        filename: 'photo.jpg',
        toBuffer: async () => Buffer.from('img'),
      }),
    } as unknown as FastifyRequest;

    for (let i = 0; i < 20; i++) {
      await controller.uploadImage(fakeReq);
    }

    await expect(controller.uploadImage(fakeReq)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    await expect(controller.uploadImage(fakeReq)).rejects.toBeInstanceOf(HttpException);
  });
});
