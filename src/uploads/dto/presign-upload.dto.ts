import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_PRESIGN_PRIMARY_BYTES = 2 * 1024 * 1024;
export const MAX_PRESIGN_THUMBNAIL_BYTES = 300 * 1024;

export class PresignUploadRequestDto {
  @ApiProperty({
    type: String,
    enum: ['image/webp'],
    example: 'image/webp',
    description: 'MIME type strict requirement for direct browser-to-storage presigned uploads',
  })
  @IsIn(['image/webp'], {
    message: 'Solo se permite image/webp para subida directa prefirmada',
  })
  contentType!: 'image/webp';

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: MAX_PRESIGN_PRIMARY_BYTES,
    example: 185420,
    description: 'Exact byte size of the compressed primary WebP image (max 2 MB)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PRESIGN_PRIMARY_BYTES, {
    message: 'La imagen principal WebP no puede superar los 2 MB',
  })
  primarySizeBytes!: number;

  @ApiProperty({
    type: Number,
    minimum: 1,
    maximum: MAX_PRESIGN_THUMBNAIL_BYTES,
    example: 28400,
    description: 'Exact byte size of the compressed thumbnail WebP image (max 300 KB)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PRESIGN_THUMBNAIL_BYTES, {
    message: 'La miniatura WebP no puede superar los 300 KB',
  })
  thumbnailSizeBytes!: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 8000, example: 1600 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8000)
  width?: number;

  @ApiPropertyOptional({ type: Number, minimum: 1, maximum: 8000, example: 1067 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(8000)
  height?: number;
}

export class PresignedTargetDto {
  @ApiProperty({
    type: String,
    example: 'v1/production/pensions/550e8400-e29b-41d4-a716-446655440000.webp',
  })
  key!: string;

  @ApiProperty({
    type: String,
    example: 'https://account.r2.cloudflarestorage.com/uploads/v1/...',
  })
  uploadUrl!: string;

  @ApiProperty({
    type: String,
    example:
      'https://media.buscatunido.cl/v1/production/pensions/550e8400-e29b-41d4-a716-446655440000.webp',
  })
  publicUrl!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  headers!: Record<string, string>;
}

export class PresignUploadResponseDto {
  @ApiProperty({ type: String, example: '550e8400-e29b-41d4-a716-446655440000' })
  fileId!: string;

  @ApiProperty({ type: PresignedTargetDto })
  primary!: PresignedTargetDto;

  @ApiProperty({ type: PresignedTargetDto })
  thumbnail!: PresignedTargetDto;

  @ApiProperty({ type: Number, example: 120 })
  expiresInSeconds!: number;
}
