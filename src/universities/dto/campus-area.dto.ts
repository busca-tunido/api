import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class GeoCoordinateDto {
  @ApiProperty({ type: Number, example: -33.496388 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ type: Number, example: -70.616067 })
  @IsNumber()
  longitude!: number;
}

export class CampusAreaDto {
  @ApiProperty({ type: String, example: 'cuid-12345' })
  @IsString()
  id!: string;

  @ApiProperty({ type: String, example: 'Campus San Joaquín' })
  @IsString()
  name!: string;

  @ApiProperty({ type: String, example: 'San Joaquín' })
  @IsString()
  acronym!: string;

  @ApiProperty({ type: Number, example: -33.49706 })
  @IsNumber()
  centerLat!: number;

  @ApiProperty({ type: Number, example: -70.61459 })
  @IsNumber()
  centerLng!: number;

  @ApiProperty({ type: () => [GeoCoordinateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoCoordinateDto)
  polygon!: GeoCoordinateDto[];
}

export class CampusAreaResponseDto {
  @ApiProperty({ type: String, example: 'cuid-12345' })
  @IsString()
  id!: string;

  @ApiProperty({ type: String, example: 'Campus San Joaquín' })
  @IsString()
  name!: string;

  @ApiProperty({ type: String, example: 'San Joaquín' })
  @IsString()
  acronym!: string;

  @ApiProperty({ type: Number, example: -33.49706 })
  @IsNumber()
  centerLat!: number;

  @ApiProperty({ type: Number, example: -70.61459 })
  @IsNumber()
  centerLng!: number;

  @ApiProperty({ type: () => [GeoCoordinateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoCoordinateDto)
  polygon!: GeoCoordinateDto[];

  @ApiProperty({ type: String, example: '6acbfe8bac0ea03feffc1e7a' })
  @IsString()
  universityId!: string;

  @ApiProperty({ type: String, example: 'Pontificia Universidad Católica de Chile' })
  @IsString()
  universityName!: string;

  @ApiProperty({ type: String, example: 'Santiago' })
  @IsString()
  city!: string;
}
