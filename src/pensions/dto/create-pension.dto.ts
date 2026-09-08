import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenderPreference } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Min,
} from 'class-validator';

export class CreatePensionDto {
  @ApiProperty({ example: 'Residencia San Joaquín' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Excelente pensión cerca de campus San Joaquín' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 'Av. Vicuña Mackenna 4860' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 'Santiago' })
  @IsString()
  city!: string;

  @ApiProperty({ example: 'San Joaquín' })
  @IsString()
  neighborhood!: string;

  @ApiProperty({ example: -33.4996 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -70.6145 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseMonthlyPrice!: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ example: 'CLP', default: 'CLP' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  waterIncluded?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  electricityIncluded?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  gasIncluded?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  internetIncluded?: boolean;

  @ApiPropertyOptional({ example: '23:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Must be HH:mm 24-hour format' })
  curfewTime?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  guestsAllowed?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  smokingAllowed?: boolean;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  petsAllowed?: boolean;

  @ApiPropertyOptional({ enum: GenderPreference, default: GenderPreference.ANY })
  @IsOptional()
  @IsEnum(GenderPreference)
  genderPreference?: GenderPreference;

  @ApiPropertyOptional({ example: '23:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Must be HH:mm 24-hour format' })
  quietHoursStart?: string;

  @ApiPropertyOptional({ example: '07:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Must be HH:mm 24-hour format' })
  quietHoursEnd?: string;

  @ApiPropertyOptional({ example: ['wifi-alta-velocidad', 'bano-privado'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-z0-9-]+$/, {
    each: true,
    message: 'Each amenity slug must contain only lowercase alphanumeric characters and hyphens',
  })
  amenitySlugs?: string[];

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID()
  nearbyUniversityId?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  distanceMeters?: number;
}
