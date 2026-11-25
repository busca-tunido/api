import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Optional,
} from '@nestjs/common';
import sharp, { type Metadata } from 'sharp';
import { env } from '../env.js';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from '../storage/object-storage.port.js';
import { S3StorageAdapter, type S3StorageConfig } from '../storage/s3-storage.adapter.js';
import {
  MAX_PRESIGN_PRIMARY_BYTES,
  MAX_PRESIGN_THUMBNAIL_BYTES,
  type PresignUploadRequestDto,
  type PresignUploadResponseDto,
} from './dto/presign-upload.dto.js';
import type { VerifyUploadRequestDto } from './dto/verify-upload.dto.js';

sharp.concurrency(1);

export type ProcessedImageResult = {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: 'webp';
  size: number;
};

export type UploadsStorageConfig = S3StorageConfig;

const SUPPORTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif', 'gif', 'tiff']);

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const PRESIGN_EXPIRES_SECONDS = 120;
const WEBP_HEADER_BYTE_LENGTH = 12;

export const isValidWebpMagicBytes = (bytes: Uint8Array | null): boolean => {
  if (!bytes || bytes.byteLength < WEBP_HEADER_BYTE_LENGTH) {
    return false;
  }
  return (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  );
};

const isObjectStoragePort = (value: unknown): value is ObjectStoragePort => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'uploadObject' in value &&
    'createPresignedPutUrl' in value &&
    'readObjectHeaderBytes' in value
  );
};

@Injectable()
export class UploadsService {
  private readonly storage: ObjectStoragePort;

  constructor(
    @Optional()
    @Inject(OBJECT_STORAGE_PORT)
    storageOrConfig?: ObjectStoragePort | UploadsStorageConfig,
  ) {
    if (isObjectStoragePort(storageOrConfig)) {
      this.storage = storageOrConfig;
    } else {
      this.storage = new S3StorageAdapter(storageOrConfig);
    }
  }

  private getFolderPrefix(): string {
    return env.NODE_ENV === 'production'
      ? 'v1/production'
      : env.NODE_ENV === 'test'
        ? 'v1/staging'
        : 'v1/local';
  }

  private buildObjectKeys(fileId: string): { primaryKey: string; thumbnailKey: string } {
    const folderPrefix = this.getFolderPrefix();
    return {
      primaryKey: `${folderPrefix}/pensions/${fileId}.webp`,
      thumbnailKey: `${folderPrefix}/pensions/${fileId}-thumb.webp`,
    };
  }

  isRemoteStorageEnabled(): boolean {
    return this.storage.isConfigured();
  }

  async ensureUploadDir(): Promise<void> {}

  async createPresignedUpload(dto: PresignUploadRequestDto): Promise<PresignUploadResponseDto> {
    if (!this.storage.isConfigured()) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }

    if (dto.contentType !== 'image/webp') {
      throw new BadRequestException('Solo se permite image/webp para subida directa prefirmada');
    }

    if (dto.primarySizeBytes <= 0 || dto.primarySizeBytes > MAX_PRESIGN_PRIMARY_BYTES) {
      throw new BadRequestException('La imagen principal WebP no puede superar los 2 MB');
    }

    if (dto.thumbnailSizeBytes <= 0 || dto.thumbnailSizeBytes > MAX_PRESIGN_THUMBNAIL_BYTES) {
      throw new BadRequestException('La miniatura WebP no puede superar los 300 KB');
    }

    const fileId = randomUUID();
    const { primaryKey, thumbnailKey } = this.buildObjectKeys(fileId);

    const [primary, thumbnail] = await Promise.all([
      this.storage.createPresignedPutUrl({
        key: primaryKey,
        contentType: 'image/webp',
        contentLength: dto.primarySizeBytes,
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        expiresInSeconds: PRESIGN_EXPIRES_SECONDS,
      }),
      this.storage.createPresignedPutUrl({
        key: thumbnailKey,
        contentType: 'image/webp',
        contentLength: dto.thumbnailSizeBytes,
        cacheControl: IMMUTABLE_CACHE_CONTROL,
        expiresInSeconds: PRESIGN_EXPIRES_SECONDS,
      }),
    ]);

    return {
      fileId,
      primary: {
        key: primary.key,
        uploadUrl: primary.uploadUrl,
        publicUrl: primary.publicUrl,
        headers: primary.headers,
      },
      thumbnail: {
        key: thumbnail.key,
        uploadUrl: thumbnail.uploadUrl,
        publicUrl: thumbnail.publicUrl,
        headers: thumbnail.headers,
      },
      expiresInSeconds: PRESIGN_EXPIRES_SECONDS,
    };
  }

  async verifyUploadedImage(dto: VerifyUploadRequestDto): Promise<ProcessedImageResult> {
    if (!this.storage.isConfigured()) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }

    const { primaryKey, thumbnailKey } = this.buildObjectKeys(dto.fileId);

    const [primaryHeader, thumbnailHeader] = await Promise.all([
      this.storage.readObjectHeaderBytes(primaryKey, WEBP_HEADER_BYTE_LENGTH),
      this.storage.readObjectHeaderBytes(thumbnailKey, WEBP_HEADER_BYTE_LENGTH),
    ]);

    const primaryValid = isValidWebpMagicBytes(primaryHeader);
    const thumbnailValid = isValidWebpMagicBytes(thumbnailHeader);

    if (!primaryValid || !thumbnailValid) {
      await Promise.allSettled([
        this.storage.deleteObject(primaryKey),
        this.storage.deleteObject(thumbnailKey),
      ]);
      throw new BadRequestException(
        'El archivo subido no es una imagen WebP válida o la subida quedó incompleta',
      );
    }

    return {
      url: this.storage.getPublicUrl(primaryKey),
      thumbnailUrl: this.storage.getPublicUrl(thumbnailKey),
      width: dto.width ?? 0,
      height: dto.height ?? 0,
      format: 'webp',
      size: dto.size ?? 0,
    };
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

    if (!this.storage.isConfigured()) {
      throw new InternalServerErrorException('Remote storage client is not configured');
    }

    const fileId = randomUUID();
    const { primaryKey, thumbnailKey } = this.buildObjectKeys(fileId);

    const primaryProcessed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    const thumbProcessed = await sharp(primaryProcessed.data)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const [primaryResult, thumbnailResult] = await Promise.all([
      this.storage.uploadObject({
        key: primaryKey,
        body: primaryProcessed.data,
        contentType: 'image/webp',
        cacheControl: IMMUTABLE_CACHE_CONTROL,
      }),
      this.storage.uploadObject({
        key: thumbnailKey,
        body: thumbProcessed,
        contentType: 'image/webp',
        cacheControl: IMMUTABLE_CACHE_CONTROL,
      }),
    ]);

    return {
      url: primaryResult.publicUrl,
      thumbnailUrl: thumbnailResult.publicUrl,
      width: primaryProcessed.info.width,
      height: primaryProcessed.info.height,
      format: 'webp',
      size: primaryProcessed.info.size,
    };
  }
}
