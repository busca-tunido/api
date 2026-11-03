import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampusAreaResponseDto } from './campus-area.dto.js';

export class UniversityCountDto {
  @ApiProperty({ type: Number, example: 120 })
  students!: number;

  @ApiProperty({ type: Number, example: 15 })
  nearbyPensions!: number;
}

export class UniversityResponseDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  id!: string;

  @ApiProperty({ type: String, example: 'Universidad de Chile' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCh' })
  shortName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCh' })
  acronym?: string | null;

  @ApiProperty({ type: String, example: 'Santiago' })
  city!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Metropolitana' })
  region?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Av. Libertador Bernardo O Higgins 1058' })
  address?: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'uchile.cl' })
  emailDomain?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['uchile.cl'] })
  emailDomains?: string[];

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://uchile.cl' })
  website?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/uchile.webp' })
  imageUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/logo.webp' })
  logoUrl?: string | null;

  @ApiProperty({ type: Number, example: -33.4443 })
  latitude!: number;

  @ApiProperty({ type: Number, example: -70.6558 })
  longitude!: number;

  @ApiPropertyOptional({ type: () => [CampusAreaResponseDto] })
  campuses?: CampusAreaResponseDto[];

  @ApiPropertyOptional({ type: () => UniversityCountDto })
  _count?: UniversityCountDto;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  updatedAt!: Date;
}
