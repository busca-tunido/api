import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReviewVisibilityDto {
  @ApiProperty({ example: true, description: 'Whether the review is hidden from public display' })
  @IsBoolean()
  isHidden!: boolean;

  @ApiPropertyOptional({ example: 'Comentario con lenguaje inapropiado o difamatorio.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
