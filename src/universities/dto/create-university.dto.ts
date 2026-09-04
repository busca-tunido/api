import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUniversityDto {
  @ApiProperty({ example: 'Universidad de Chile' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'UCH' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional({ example: ['uchile.cl', 'alumnos.uchile.cl'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  emailDomains?: string[];

  @ApiProperty({ example: 'Santiago' })
  @IsString()
  city!: string;

  @ApiProperty({ example: "Av. Libertador Bernardo O'Higgins 1058" })
  @IsString()
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
