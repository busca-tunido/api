import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class GeoCoordinateDto {
  @ApiProperty({ example: -33.496388 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: -70.616067 })
  @IsNumber()
  longitude!: number;
}

export class CampusAreaDto {
  @ApiProperty({ example: 'cuid-12345' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Campus San Joaquín' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'San Joaquín' })
  @IsString()
  acronym!: string;

  @ApiProperty({ example: -33.49706 })
  @IsNumber()
  centerLat!: number;

  @ApiProperty({ example: -70.61459 })
  @IsNumber()
  centerLng!: number;

  @ApiProperty({ type: [GeoCoordinateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoCoordinateDto)
  polygon!: GeoCoordinateDto[];
}

export class CampusAreaResponseDto extends CampusAreaDto {
  @ApiProperty({ example: '6acbfe8bac0ea03feffc1e7a' })
  @IsString()
  universityId!: string;

  @ApiProperty({ example: 'Pontificia Universidad Católica de Chile' })
  @IsString()
  universityName!: string;

  @ApiProperty({ example: 'Santiago' })
  @IsString()
  city!: string;
}
