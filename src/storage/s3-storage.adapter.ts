import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, InternalServerErrorException, Optional } from '@nestjs/common';
import { env } from '../env.js';
import type {
  ObjectStoragePort,
  PresignedPutInput,
  PresignedPutResult,
  UploadObjectInput,
  UploadObjectResult,
} from './object-storage.port.js';

export type S3StorageConfig = {
  readonly endpoint?: string | null;
  readonly region?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly bucketName?: string;
  readonly publicBaseUrl?: string | null;
};

const DEFAULT_PRESIGN_EXPIRES_SECONDS = 120;

const isNotFoundS3Error = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as {
    name?: string;
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
  };
  const code = candidate.Code ?? candidate.code ?? candidate.name ?? '';
  return (
    code === 'NoSuchKey' ||
    code === 'NotFound' ||
    code === '404' ||
    candidate.$metadata?.httpStatusCode === 404
  );
};

const readBodyBytes = async (body: unknown, maxBytes: number): Promise<Uint8Array> => {
  if (!body) {
    return new Uint8Array(0);
  }
  if (body instanceof Uint8Array) {
    return body.subarray(0, maxBytes);
  }
  if (typeof (body as { transformToByteArray?: unknown }).transformToByteArray === 'function') {
    const bytes = await (
      body as { transformToByteArray: () => Promise<Uint8Array> }
    ).transformToByteArray();
    return bytes.subarray(0, maxBytes);
  }
  if (Symbol.asyncIterator in (body as object)) {
    const chunks: Uint8Array[] = [];
    let collected = 0;
    for await (const chunk of body as AsyncIterable<Uint8Array | Buffer | string>) {
      const buf =
        typeof chunk === 'string'
          ? Buffer.from(chunk)
          : chunk instanceof Uint8Array
            ? chunk
            : new Uint8Array(chunk);
      chunks.push(buf);
      collected += buf.byteLength;
      if (collected >= maxBytes) {
        break;
      }
    }
    return Buffer.concat(chunks).subarray(0, maxBytes);
  }
  return new Uint8Array(0);
};

@Injectable()
export class S3StorageAdapter implements ObjectStoragePort {
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string | null = null;

  constructor(@Optional() storageConfig?: S3StorageConfig) {
    const endpoint =
      storageConfig !== undefined
        ? (storageConfig.endpoint ?? undefined)
        : env.S3_ENDPOINT || env.PUBLIC_AWS_ENDPOINT_URL_S3 || env.AWS_ENDPOINT_URL_S3;

    this.bucketName = storageConfig?.bucketName ?? env.S3_BUCKET ?? env.PUBLIC_STORAGE_BUCKET;

    if (endpoint) {
      const region = storageConfig?.region ?? env.S3_REGION ?? env.PUBLIC_AWS_REGION;
      const accessKeyId =
        storageConfig?.accessKeyId ?? env.S3_ACCESS_KEY_ID ?? env.AWS_ACCESS_KEY_ID;
      const secretAccessKey =
        storageConfig?.secretAccessKey ?? env.S3_SECRET_ACCESS_KEY ?? env.AWS_SECRET_ACCESS_KEY;

      const credentials =
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials,
        forcePathStyle: true,
        // Disable automatic flexible CRC32 checksums so presigned PUT URLs work cleanly
        // with direct browser fetch() uploads on Cloudflare R2, Backblaze B2, and MinIO.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });

      const customPublicUrl =
        storageConfig !== undefined
          ? (storageConfig.publicBaseUrl ?? undefined)
          : env.PUBLIC_STORAGE_BASE_URL ||
            env.PUBLIC_NEON_STORAGE_BASE_URL ||
            env.NEON_STORAGE_PUBLIC_BASE_URL;

      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      this.publicBaseUrl = customPublicUrl
        ? customPublicUrl.replace(/\/+$/, '')
        : `${cleanEndpoint}/${this.bucketName}`;
    }
  }

  isConfigured(): boolean {
    return this.s3Client !== null && this.publicBaseUrl !== null;
  }

  getPublicUrl(key: string): string {
    if (!this.publicBaseUrl) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }
    const cleanKey = key.replace(/^\/+/, '');
    return `${this.publicBaseUrl}/${cleanKey}`;
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    if (!this.s3Client || !this.publicBaseUrl) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
          CacheControl: input.cacheControl,
        }),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error uploading to storage';
      throw new InternalServerErrorException(message);
    }

    return {
      key: input.key,
      publicUrl: this.getPublicUrl(input.key),
    };
  }

  async createPresignedPutUrl(input: PresignedPutInput): Promise<PresignedPutResult> {
    if (!this.s3Client || !this.publicBaseUrl) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }

    const expiresInSeconds = input.expiresInSeconds ?? DEFAULT_PRESIGN_EXPIRES_SECONDS;

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.key,
        ContentType: input.contentType,
        ContentLength: input.contentLength,
        CacheControl: input.cacheControl,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(['content-type', 'cache-control']),
      });

      return {
        key: input.key,
        uploadUrl,
        publicUrl: this.getPublicUrl(input.key),
        headers: {
          'Content-Type': input.contentType,
          'Cache-Control': input.cacheControl,
        },
        expiresInSeconds,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating presigned upload URL';
      throw new InternalServerErrorException(message);
    }
  }

  async readObjectHeaderBytes(key: string, byteCount = 12): Promise<Uint8Array | null> {
    if (!this.s3Client) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }

    const safeCount = Math.max(1, Math.min(byteCount, 64));

    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Range: `bytes=0-${safeCount - 1}`,
        }),
      );
      return await readBodyBytes(response.Body, safeCount);
    } catch (err: unknown) {
      if (isNotFoundS3Error(err)) {
        return null;
      }
      const message = err instanceof Error ? err.message : 'Error reading uploaded object header';
      throw new InternalServerErrorException(message);
    }
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.s3Client) {
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (err: unknown) {
      if (isNotFoundS3Error(err)) {
        return;
      }
    }
  }
}
