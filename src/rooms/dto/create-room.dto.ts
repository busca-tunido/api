import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRoomDto {
  @ApiPropertyOptional({ example: 'Hab 101', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El número o identificador no puede superar los 20 caracteres' })
  roomNumber?: string;

  @ApiProperty({ example: 'Habitación Individual Luminosa', minLength: 3, maxLength: 80 })
  @IsString()
  @MinLength(3, { message: 'El título de la habitación debe tener al menos 3 caracteres' })
  @MaxLength(80, { message: 'El título de la habitación no puede superar los 80 caracteres' })
  title!: string;

  @ApiPropertyOptional({ example: 'Pieza amoblada con clóset y escritorio.', maxLength: 800 })
  @IsOptional()
  @IsString()
  @MaxLength(800, { message: 'La descripción no puede superar los 800 caracteres' })
  description?: string;

  @ApiPropertyOptional({ enum: RoomType, default: RoomType.SINGLE })
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @ApiProperty({ example: 250000, minimum: 0, maximum: 1200000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El precio mensual no puede ser negativo' })
  @Max(1200000, { message: 'El precio mensual de la habitación no puede superar $1.200.000 CLP' })
  monthlyPrice!: number;

  @ApiPropertyOptional({ example: 250000, minimum: 0, maximum: 1200000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'El depósito no puede ser negativo' })
  @Max(1200000, { message: 'El depósito no puede superar $1.200.000 CLP' })
  deposit?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  hasPrivateBathroom?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 1, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'Una habitación debe tener al menos 1 cama' })
  @Max(10, { message: 'Una habitación no puede tener más de 10 camas' })
  totalBeds?: number;

  @ApiPropertyOptional({ example: 1, default: 1, minimum: 0, maximum: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Las camas disponibles no pueden ser negativas' })
  @Max(10, { message: 'Las camas disponibles no pueden superar 10' })
  availableBeds?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: ['https://example.com/room1.jpg'], maxItems: 5 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Máximo 5 fotos permitidas por habitación' })
  @IsString({ each: true })
  images?: string[];
}
