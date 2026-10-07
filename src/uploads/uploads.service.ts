import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import sharp, { type Metadata } from 'sharp';
import { env } from '../env.js';

export type ProcessedImageResult = {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: 'webp';
  size: number;
};

export type UploadsStorageConfig = {
  readonly endpoint?: string | null;
  readonly region?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly bucketName?: string;
  readonly publicBaseUrl?: string | null;
};

const SUPPORTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif', 'gif', 'tiff']);

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string | null = null;

  constructor(@Optional() storageConfig?: UploadsStorageConfig) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');

    const endpoint =
      storageConfig !== undefined
        ? (storageConfig.endpoint ?? undefined)
        : env.PUBLIC_AWS_ENDPOINT_URL_S3 || env.AWS_ENDPOINT_URL_S3;

    if (endpoint) {
      const region = storageConfig?.region ?? env.PUBLIC_AWS_REGION;

      const accessKeyId = storageConfig?.accessKeyId ?? env.AWS_ACCESS_KEY_ID;

      const secretAccessKey = storageConfig?.secretAccessKey ?? env.AWS_SECRET_ACCESS_KEY;

      const credentials =
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials,
        forcePathStyle: true,
      });

      this.bucketName = storageConfig?.bucketName ?? env.PUBLIC_STORAGE_BUCKET;

      const customPublicUrl =
        storageConfig !== undefined
          ? (storageConfig.publicBaseUrl ?? undefined)
          : env.PUBLIC_NEON_STORAGE_BASE_URL || env.NEON_STORAGE_PUBLIC_BASE_URL;

      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      this.publicBaseUrl = customPublicUrl
        ? customPublicUrl.replace(/\/+$/, '')
        : `${cleanEndpoint}/${this.bucketName}`;
    } else {
      this.bucketName = env.PUBLIC_STORAGE_BUCKET;
    }
  }

  isRemoteStorageEnabled(): boolean {
    return this.s3Client !== null;
  }

  async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {
      // Ignore if already exists
    }
  }

  async processImage(buffer: Buffer, _originalFilename?: string): Promise<ProcessedImageResult> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Image buffer cannot be empty');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException('Image file size exceeds maximum limit of 8MB');
    }

    let metadata: Metadata;
    try {
      metadata = await sharp(buffer).metadata();
    } catch {
      throw new BadRequestException('Uploaded file is not a valid or readable image');
    }

    if (!metadata.format || !SUPPORTED_FORMATS.has(metadata.format.toLowerCase())) {
      throw new BadRequestException(
        `Unsupported image format '${metadata.format}'. Allowed formats: JPEG, PNG, WebP, AVIF, HEIF, GIF`,
      );
    }

    const fileId = randomUUID();
    const primaryFilename = `${fileId}.webp`;
    const thumbnailFilename = `${fileId}-thumb.webp`;

    const primaryProcessed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const thumbProcessed = await sharp(buffer)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const folderPrefix =
      env.NODE_ENV === 'production' ? 'prod' : env.NODE_ENV === 'test' ? 'test' : 'dev';
    const primaryKey = `${folderPrefix}/pensions/${primaryFilename}`;
    const thumbnailKey = `${folderPrefix}/pensions/${thumbnailFilename}`;

    if (this.s3Client && this.publicBaseUrl) {
      try {
        await Promise.all([
          this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: primaryKey,
              Body: primaryProcessed.data,
              ContentType: 'image/webp',
            }),
          ),
          this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: thumbnailKey,
              Body: thumbProcessed,
              ContentType: 'image/webp',
            }),
          ),
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error uploading to storage';
        throw new InternalServerErrorException(message);
      }

      return {
        url: `${this.publicBaseUrl}/${primaryKey}`,
        thumbnailUrl: `${this.publicBaseUrl}/${thumbnailKey}`,
        width: primaryProcessed.info.width,
        height: primaryProcessed.info.height,
        format: 'webp',
        size: primaryProcessed.info.size,
      };
    }

    const localTargetDir = path.join(this.uploadDir, folderPrefix, 'pensions');
    await fs.mkdir(localTargetDir, { recursive: true });

    const primaryFilePath = path.join(localTargetDir, primaryFilename);
    const thumbnailFilePath = path.join(localTargetDir, thumbnailFilename);

    await Promise.all([
      fs.writeFile(primaryFilePath, primaryProcessed.data),
      fs.writeFile(thumbnailFilePath, thumbProcessed),
    ]);

    return {
      url: `/uploads/${primaryKey}`,
      thumbnailUrl: `/uploads/${thumbnailKey}`,
      width: primaryProcessed.info.width,
      height: primaryProcessed.info.height,
      format: 'webp',
      size: primaryProcessed.info.size,
    };
  }
}
