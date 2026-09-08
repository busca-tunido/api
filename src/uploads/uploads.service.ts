import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import sharp, { type Metadata } from 'sharp';

export interface ProcessedImageResult {
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: 'webp';
  size: number;
}

const SUPPORTED_FORMATS = new Set(['jpeg', 'jpg', 'png', 'webp', 'avif', 'heif', 'gif', 'tiff']);

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

@Injectable()
export class UploadsService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), 'uploads');
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

    await this.ensureUploadDir();

    const fileId = randomUUID();
    const primaryFilename = `${fileId}.webp`;
    const thumbnailFilename = `${fileId}-thumb.webp`;

    const primaryFilePath = path.join(this.uploadDir, primaryFilename);
    const thumbnailFilePath = path.join(this.uploadDir, thumbnailFilename);

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
