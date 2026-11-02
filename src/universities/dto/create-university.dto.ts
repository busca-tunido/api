import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUniversityDto {
  @ApiProperty({ example: 'Universidad de Chile', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'UCH', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shortName?: string;

  @ApiPropertyOptional({ example: ['uchile.cl', 'alumnos.uchile.cl'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailDomains?: string[];

  @ApiProperty({ example: 'Santiago', maxLength: 60 })
  @IsString()
  @MaxLength(60)
  city!: string;

  @ApiProperty({ example: "Av. Libertador Bernardo O'Higgins 1058", maxLength: 150 })
  @IsString()
  @MaxLength(150)
  address!: string;

  @ApiProperty({ example: -33.4442 })
  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -70.6517 })
  @Type(() => Number)
  @IsNumber()
  longitude!: number;
}
