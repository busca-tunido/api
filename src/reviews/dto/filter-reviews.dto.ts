import { ApiPropertyOptional } from '@nestjs/swagger';
import { StayDurationCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum ReviewSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  RATING_DESC = 'rating_desc',
  RATING_ASC = 'rating_asc',
}

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
    example: 4,
    minimum: 1,
    maximum: 5,
    description: 'Filter by minimum overall rating',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

  @ApiPropertyOptional({
    example: 3,
    minimum: 1,
    maximum: 5,
    description: 'Filter by maximum overall rating',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  maxRating?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Only include reviews that have at least one image',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasPhotos?: boolean;

  @ApiPropertyOptional({
    enum: StayDurationCategory,
    enumName: 'StayDurationCategory',
    description: 'Filter by stay duration category',
  })
  @IsOptional()
  @IsEnum(StayDurationCategory)
  stayDurationCategory?: StayDurationCategory;

  @ApiPropertyOptional({
    example: ReviewSortBy.NEWEST,
    enum: ReviewSortBy,
    enumName: 'ReviewSortBy',
    default: ReviewSortBy.NEWEST,
    description: 'Sort order for reviews',
  })
  @IsOptional()
  @IsIn(['newest', 'oldest', 'rating_desc', 'rating_asc'])
  sortBy?: ReviewSortBy | 'newest' | 'oldest' | 'rating_desc' | 'rating_asc' = ReviewSortBy.NEWEST;
}
