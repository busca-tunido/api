import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class FilterReviewsDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page (1-50)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Filter by exact overall rating',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    example: 'newest',
    enum: ['newest', 'oldest', 'rating_desc', 'rating_asc'],
    default: 'newest',
    description: 'Sort order for reviews',
  })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'rating_desc', 'rating_asc'])
  sortBy?: 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' = 'newest';
}
