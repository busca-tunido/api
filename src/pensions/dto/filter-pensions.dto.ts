import { ApiPropertyOptional } from '@nestjs/swagger';
import { GenderPreference } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class FilterPensionsDto {
  @ApiPropertyOptional({ example: 'Santiago' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'San Joaquín' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 400000 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: GenderPreference })
  @IsOptional()
  @IsEnum(GenderPreference)
  genderPreference?: GenderPreference;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID()
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
  amenities?: string[];

  @ApiPropertyOptional({ example: 'República' })
  @IsOptional()
  @IsString()
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
}
