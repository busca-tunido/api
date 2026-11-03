import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { PensionImageResponseDto } from '../../pensions/dto/pension-response.dto.js';

export class FavoritePensionSummaryDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'residencia-san-joaquin' })
  slug!: string;

  @ApiProperty({ type: String, example: 'Residencia San Joaquín' })
  title!: string;

  @ApiProperty({ type: String, example: 'Santiago' })
  city!: string;

  @ApiProperty({ type: String, example: 'San Joaquín' })
  neighborhood!: string;

  @ApiProperty({ type: Number, example: 250000 })
  baseMonthlyPrice!: number;

  @ApiProperty({ type: Number, example: 4.8 })
  ratingAverage!: number;

  @ApiProperty({ type: Number, example: 12 })
  ratingCount!: number;

  @ApiProperty({ type: () => [PensionImageResponseDto] })
  images!: PensionImageResponseDto[];

  @ApiPropertyOptional({
    enum: VerificationStatus,
    enumName: 'VerificationStatus',
    example: VerificationStatus.OFFICIALLY_VERIFIED,
  })
  verificationStatus?: VerificationStatus;
}

export class FavoriteItemResponseDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  userId!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  pensionId!: string;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: () => FavoritePensionSummaryDto })
  pension!: FavoritePensionSummaryDto;
}

export class FavoriteAddedResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  added!: boolean;
}

export class FavoriteRemovedResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  removed!: boolean;
}
