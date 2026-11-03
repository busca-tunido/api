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
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePensionDto {
  @ApiProperty({ example: 'Residencia San Joaquín', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El título no puede superar los 100 caracteres' })
  title!: string;

  @ApiProperty({ example: 'Excelente pensión cerca de campus San Joaquín', maxLength: 1500 })
  @IsString()
  @MaxLength(1500, { message: 'La descripción no puede superar los 1500 caracteres' })
  description!: string;

  @ApiProperty({ example: 'Av. Vicuña Mackenna 4860', maxLength: 120 })
  @IsString()
  @MaxLength(120, { message: 'La dirección no puede superar los 120 caracteres' })
  address!: string;

  @ApiProperty({ example: 'Santiago', maxLength: 60 })
  @IsString()
  @MaxLength(60, { message: 'La ciudad no puede superar los 60 caracteres' })
  city!: string;

  @ApiProperty({ example: 'San Joaquín', maxLength: 60 })
  @IsString()
  @MaxLength(60, { message: 'El barrio/comuna no puede superar los 60 caracteres' })
  neighborhood!: string;

  @ApiProperty({ example: -33.4996 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -70.6145 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 250000, minimum: 0, maximum: 2000000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El precio base mensual no puede ser negativo' })
  @Max(2000000, { message: 'El precio base mensual no puede superar $2.000.000 CLP' })
  baseMonthlyPrice!: number;

  @ApiPropertyOptional({ example: 250000, minimum: 0, maximum: 1500000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El mes de garantía no puede ser negativo' })
  @Max(1500000, { message: 'El mes de garantía no puede superar $1.500.000 CLP' })
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

  @ApiPropertyOptional({ example: '6659f8c123456789abcdef01' })
  @IsOptional()
  @IsString()
  nearbyUniversityId?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  distanceMeters?: number;

  @ApiPropertyOptional({ example: 'Sra. Carmen Gloria', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'El nombre de contacto no puede superar los 100 caracteres' })
  contactName?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El teléfono de contacto no puede superar los 30 caracteres' })
  contactPhone?: string;

  @ApiPropertyOptional({ example: '+56 9 1234 5678', maxLength: 30 })
  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'El WhatsApp de contacto no puede superar los 30 caracteres' })
  contactWhatsapp?: string;

  @ApiPropertyOptional({ example: 'contacto@residencia.cl', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120, { message: 'El correo de contacto no puede superar los 120 caracteres' })
  contactEmail?: string;
}
