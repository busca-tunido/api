import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UniversityResponseDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  id!: string;

  @ApiProperty({ type: String, example: 'Universidad de Chile' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCh' })
  shortName!: string | null;

  @ApiProperty({ type: String, example: 'Santiago' })
  city!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Metropolitana' })
  region?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'uchile.cl' })
  emailDomain?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://uchile.cl' })
  website?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: -33.4443 })
  latitude?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: -70.6558 })
  longitude?: number | null;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  updatedAt!: Date;
}
