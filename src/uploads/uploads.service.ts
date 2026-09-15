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
import { ConfigService } from '@nestjs/config';
import sharp, { type Metadata } from 'sharp';

export type ProcessedImageResult = {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: 'webp';
  size: number;
};

const SUPPORTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif', 'gif', 'tiff']);

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicBaseUrl: string | null = null;

  constructor(@Optional() private readonly configService?: ConfigService) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');

    const endpoint =
      this.configService?.get<string>('PUBLIC_AWS_ENDPOINT_URL_S3') ||
      this.configService?.get<string>('AWS_ENDPOINT_URL_S3') ||
      process.env.PUBLIC_AWS_ENDPOINT_URL_S3 ||
      process.env.AWS_ENDPOINT_URL_S3;

    if (endpoint) {
      const region =
        this.configService?.get<string>('PUBLIC_AWS_REGION') ||
        this.configService?.get<string>('AWS_REGION') ||
        process.env.PUBLIC_AWS_REGION ||
        process.env.AWS_REGION ||
        'us-east-2';

      const accessKeyId =
        this.configService?.get<string>('AWS_ACCESS_KEY_ID') || process.env.AWS_ACCESS_KEY_ID;

      const secretAccessKey =
        this.configService?.get<string>('AWS_SECRET_ACCESS_KEY') ||
        process.env.AWS_SECRET_ACCESS_KEY;

      const credentials =
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

      this.s3Client = new S3Client({
        endpoint,
        region,
        credentials,
        forcePathStyle: true,
      });

      this.bucketName =
        this.configService?.get<string>('PUBLIC_STORAGE_BUCKET') ||
        this.configService?.get<string>('STORAGE_BUCKET') ||
        process.env.PUBLIC_STORAGE_BUCKET ||
        process.env.STORAGE_BUCKET ||
        'uploads';

      const customPublicUrl =
        this.configService?.get<string>('PUBLIC_NEON_STORAGE_BASE_URL') ||
        this.configService?.get<string>('NEON_STORAGE_PUBLIC_BASE_URL') ||
        process.env.PUBLIC_NEON_STORAGE_BASE_URL ||
        process.env.NEON_STORAGE_PUBLIC_BASE_URL;

      const cleanEndpoint = endpoint.replace(/\/+$/, '');
      this.publicBaseUrl = customPublicUrl
        ? customPublicUrl.replace(/\/+$/, '')
        : `${cleanEndpoint}/${this.bucketName}`;
    } else {
      this.bucketName = 'uploads';
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

    if (this.s3Client && this.publicBaseUrl) {
      try {
        await Promise.all([
          this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: primaryFilename,
              Body: primaryProcessed.data,
              ContentType: 'image/webp',
            }),
          ),
          this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: thumbnailFilename,
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
        url: `${this.publicBaseUrl}/${primaryFilename}`,
        thumbnailUrl: `${this.publicBaseUrl}/${thumbnailFilename}`,
        width: primaryProcessed.info.width,
        height: primaryProcessed.info.height,
        format: 'webp',
        size: primaryProcessed.info.size,
      };
    }

    await this.ensureUploadDir();

    const primaryFilePath = path.join(this.uploadDir, primaryFilename);
    const thumbnailFilePath = path.join(this.uploadDir, thumbnailFilename);

    await Promise.all([
      fs.writeFile(primaryFilePath, primaryProcessed.data),
      fs.writeFile(thumbnailFilePath, thumbProcessed),
    ]);

    return {
      url: `/uploads/${primaryFilename}`,
      thumbnailUrl: `/uploads/${thumbnailFilename}`,
      width: primaryProcessed.info.width,
      height: primaryProcessed.info.height,
      format: 'webp',
      size: primaryProcessed.info.size,
    };
  }
}
