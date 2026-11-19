import { ApiPropertyOptional } from '@nestjs/swagger';
import { GenderPreference, RoomType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum PensionSortBy {
  RELEVANCE = 'relevance',
  DISTANCE = 'distance',
  RATING = 'rating',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
}

export enum PensionViewMode {
  FULL = 'full',
  CARD = 'card',
  MAP = 'map',
}

export enum PensionRatingTierFilter {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  UNREVIEWED = 'unreviewed',
}

export class FilterPensionsDto {
  @ApiPropertyOptional({ example: 'Santiago', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  city?: string;

  @ApiPropertyOptional({ example: 'San Joaquín', maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  neighborhood?: string;

  @ApiPropertyOptional({ example: 150000, minimum: 0, maximum: 2000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2000000)
  minPrice?: number;

  @ApiPropertyOptional({ example: 400000, minimum: 0, maximum: 2000000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2000000)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: GenderPreference, enumName: 'GenderPreference' })
  @IsOptional()
  @IsEnum(GenderPreference)
  genderPreference?: GenderPreference;

  @ApiPropertyOptional({ example: '6659f8c123456789abcdef01' })
  @IsOptional()
  @IsString()
  universityId?: string;

  @ApiPropertyOptional({ example: 'wifi-alta-velocidad,cocina-equipada' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiPropertyOptional({ enum: RoomType, enumName: 'RoomType' })
  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasPrivateBathroom?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includesMeals?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minBeds?: number;

  @ApiPropertyOptional({ example: 'República', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 12, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  @ApiPropertyOptional({ example: -33.4489, description: 'Latitude coordinate of user location' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-56.0)
  @Max(-17.0)
  latitude?: number;

  @ApiPropertyOptional({ example: -70.6693, description: 'Longitude coordinate of user location' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-110.0)
  @Max(-66.0)
  longitude?: number;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Radius in km (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number = 30;

  @ApiPropertyOptional({ example: -33.5, description: 'Minimum latitude boundary (South)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minLat?: number;

  @ApiPropertyOptional({ example: -33.4, description: 'Maximum latitude boundary (North)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxLat?: number;

  @ApiPropertyOptional({ example: -70.7, description: 'Minimum longitude boundary (West)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minLng?: number;

  @ApiPropertyOptional({ example: -70.6, description: 'Maximum longitude boundary (East)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxLng?: number;

  @ApiPropertyOptional({
    example: PensionSortBy.RELEVANCE,
    enum: PensionSortBy,
    enumName: 'PensionSortBy',
  })
  @IsOptional()
  @IsIn(['relevance', 'distance', 'rating', 'price_asc', 'price_desc'])
  sortBy?: PensionSortBy | 'relevance' | 'distance' | 'rating' | 'price_asc' | 'price_desc';

  @ApiPropertyOptional({
    example: PensionViewMode.FULL,
    enum: PensionViewMode,
    enumName: 'PensionViewMode',
    default: PensionViewMode.FULL,
    description: 'Payload projection mode (full, card, or map)',
  })
  @IsOptional()
  @IsIn(['full', 'card', 'map'])
  view?: PensionViewMode | 'full' | 'card' | 'map';

  @ApiPropertyOptional({
    enum: PensionRatingTierFilter,
    enumName: 'PensionRatingTierFilter',
    description: 'Filter by community rating tier (high, medium, low, unreviewed)',
  })
  @IsOptional()
  @IsIn(['high', 'medium', 'low', 'unreviewed'])
  ratingTier?: PensionRatingTierFilter | 'high' | 'medium' | 'low' | 'unreviewed';

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions that have at least one available active room',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onlyAvailable?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions with WiFi / Internet included',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  internetIncluded?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions that allow pets',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions that allow guests',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  guestsAllowed?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions that allow smoking',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  smokingAllowed?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions without a curfew time restriction',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  noCurfew?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions with water utility included',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  waterIncluded?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions with electricity utility included',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  electricityIncluded?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter pensions with gas utility included',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  gasIncluded?: boolean;
}
