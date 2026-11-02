import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StayDurationCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  overallRating!: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  cleanlinessRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  landlordRating?: number;

  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  quietnessRating?: number;

  @ApiPropertyOptional({ example: 5, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  wifiRating?: number;

  @ApiProperty({
    example: 'Excelente pensión y ambiente de estudio.',
    minLength: 15,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(15, { message: 'El comentario debe tener al menos 15 caracteres' })
  @MaxLength(1000, { message: 'El comentario no puede superar los 1.000 caracteres' })
  comment!: string;

  @ApiPropertyOptional({ example: ['https://example.com/review1.jpg'], maxItems: 3 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3, { message: 'Máximo 3 fotos permitidas por reseña' })
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ enum: StayDurationCategory })
  @IsOptional()
  @IsEnum(StayDurationCategory)
  stayDurationCategory?: StayDurationCategory;
}
