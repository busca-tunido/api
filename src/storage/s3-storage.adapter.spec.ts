import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { InternalServerErrorException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S3StorageAdapter } from './s3-storage.adapter.js';

describe('S3StorageAdapter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const configuredAdapter = () =>
    new S3StorageAdapter({
      endpoint: 'https://account123.r2.cloudflarestorage.com',
      region: 'auto',
      accessKeyId: 'r2-access-key',
      secretAccessKey: 'r2-secret-key',
      bucketName: 'buscatunido-media',
      publicBaseUrl: 'https://media.buscatunido.cl/',
    });

  it('reports configured state and builds clean custom CDN public URLs', () => {
    const adapter = configuredAdapter();
    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.getPublicUrl('/v1/production/pensions/abc.webp')).toBe(
      'https://media.buscatunido.cl/v1/production/pensions/abc.webp',
    );
  });

  it('reports unconfigured state and throws on operations when endpoint is missing', async () => {
    const adapter = new S3StorageAdapter({ endpoint: null });
    expect(adapter.isConfigured()).toBe(false);
    expect(() => adapter.getPublicUrl('a.webp')).toThrow(InternalServerErrorException);
    await expect(
      adapter.uploadObject({
        key: 'a.webp',
        body: Buffer.from('x'),
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('generates a presigned PUT URL signing Content-Type, Content-Length, and Cache-Control', async () => {
    const adapter = configuredAdapter();
    const result = await adapter.createPresignedPutUrl({
      key: 'v1/production/pensions/550e8400-e29b-41d4-a716-446655440000.webp',
      contentType: 'image/webp',
      contentLength: 123456,
      cacheControl: 'public, max-age=31536000, immutable',
      expiresInSeconds: 120,
    });

    expect(result.key).toBe('v1/production/pensions/550e8400-e29b-41d4-a716-446655440000.webp');
    expect(result.publicUrl).toBe(
      'https://media.buscatunido.cl/v1/production/pensions/550e8400-e29b-41d4-a716-446655440000.webp',
    );
    expect(result.expiresInSeconds).toBe(120);
    expect(result.headers).toEqual({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    const parsed = new URL(result.uploadUrl);
    expect(parsed.origin).toBe('https://account123.r2.cloudflarestorage.com');
    expect(parsed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('120');
    const signedHeaders = parsed.searchParams.get('X-Amz-SignedHeaders') ?? '';
    expect(signedHeaders).toContain('content-type');
    expect(signedHeaders).toContain('content-length');
    expect(signedHeaders).toContain('cache-control');
    expect(parsed.searchParams.has('x-amz-checksum-crc32')).toBe(false);
  });

  it('uploads objects with immutable CacheControl via PutObjectCommand', async () => {
    const adapter = configuredAdapter();
    const sendSpy = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

    const res = await adapter.uploadObject({
      key: 'v1/production/pensions/test.webp',
      body: Buffer.from('RIFFxxxxWEBP'),
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const cmd = sendSpy.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input.Bucket).toBe('buscatunido-media');
    expect(cmd.input.CacheControl).toBe('public, max-age=31536000, immutable');
    expect(res.publicUrl).toBe('https://media.buscatunido.cl/v1/production/pensions/test.webp');
  });

  it('reads only the first 12 bytes via Range header and returns null on NoSuchKey', async () => {
    const adapter = configuredAdapter();
    const headerBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    const sendSpy = vi.spyOn(S3Client.prototype, 'send').mockResolvedValueOnce({
      Body: { transformToByteArray: async () => headerBytes },
    } as never);

    const bytes = await adapter.readObjectHeaderBytes('v1/production/pensions/test.webp', 12);
    expect(bytes).toEqual(headerBytes);
    const cmd = sendSpy.mock.calls[0]?.[0] as GetObjectCommand;
    expect(cmd).toBeInstanceOf(GetObjectCommand);
    expect(cmd.input.Range).toBe('bytes=0-11');

    sendSpy.mockRejectedValueOnce({ name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
    const missing = await adapter.readObjectHeaderBytes('v1/production/pensions/missing.webp', 12);
    expect(missing).toBeNull();
  });

  it('deletes invalid uploaded objects via DeleteObjectCommand', async () => {
    const adapter = configuredAdapter();
    const sendSpy = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);

    await adapter.deleteObject('v1/production/pensions/bad.webp');
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy.mock.calls[0]?.[0]).toBeInstanceOf(DeleteObjectCommand);
  });
});
