import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { MAX_PRESIGN_PRIMARY_BYTES } from './presign-upload.dto.js';

export class VerifyUploadRequestDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'UUID returned by POST /uploads/presign to verify both primary and thumbnail objects',
  })
  @IsUUID('4', { message: 'El identificador del archivo debe ser un UUID v4 válido' })
  fileId!: string;

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

  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: MAX_PRESIGN_PRIMARY_BYTES,
    example: 185420,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PRESIGN_PRIMARY_BYTES)
  size?: number;
}
