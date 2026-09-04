import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Hab 101' })
  @IsString()
  roomNumber!: string;

  @ApiProperty({ example: 'Habitación Individual Luminosa' })
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Pieza amoblada con clóset y escritorio.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: RoomType, default: RoomType.SINGLE })
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;

  @ApiProperty({ example: 250000 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyPrice!: number;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  hasPrivateBathroom?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  totalBeds?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableBeds?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: ['https://example.com/room1.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
