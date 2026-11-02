import { ApiProperty } from '@nestjs/swagger';

export class UploadImageResponseDto {
  @ApiProperty({ type: String, example: '/uploads/abcd-1234.webp' })
  url!: string;

  @ApiProperty({ type: String, example: '/uploads/abcd-1234-thumb.webp' })
  thumbnailUrl!: string;

  @ApiProperty({ type: Number, example: 1200 })
  width!: number;

  @ApiProperty({ type: Number, example: 800 })
  height!: number;

  @ApiProperty({ type: String, example: 'webp' })
  format!: string;

  @ApiProperty({ type: Number, example: 124500 })
  size!: number;
}
