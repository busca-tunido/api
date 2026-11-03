import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StayDurationCategory } from '@prisma/client';

export class ReviewUserUniversityDto {
  @ApiPropertyOptional({ type: String, nullable: true, example: 'Universidad de Chile' })
  name?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCh' })
  shortName?: string | null;
}

export class ReviewUserDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'Carlos' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Gómez' })
  lastName!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/avatar.jpg' })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: () => ReviewUserUniversityDto, nullable: true })
  university?: ReviewUserUniversityDto | null;
}

export class ReviewAuthorDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'Carlos' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Gómez' })
  lastName!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/avatar.jpg' })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Universidad de Chile' })
  universityName?: string | null;
}

export class ReviewResponseDto {
  @ApiProperty({ type: String, example: 'rev-123' })
  id!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  pensionId!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  userId!: string;

  @ApiProperty({ type: Number, example: 5 })
  rating!: number;

  @ApiProperty({ type: Number, example: 5 })
  overallRating!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 5 })
  cleanlinessRating?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 })
  ownerRating?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 })
  landlordRating?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 5 })
  locationRating?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 5 })
  quietnessRating?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 5 })
  wifiRating?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 4 })
  valueRating?: number | null;

  @ApiProperty({
    type: String,
    example: 'Excelente pensión, muy cerca del campus y con excelente ambiente.',
  })
  comment!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'La cercanía al metro y la buena onda.',
  })
  positiveComment?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'El internet se ralentiza un poco en la noche.',
  })
  negativeComment?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 10 })
  stayDurationMonths?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 2025 })
  stayYear?: number | null;

  @ApiPropertyOptional({
    enum: StayDurationCategory,
    enumName: 'StayDurationCategory',
    nullable: true,
    example: StayDurationCategory.ONE_SEMESTER,
  })
  stayDurationCategory?: StayDurationCategory | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SINGLE' })
  roomType?: string | null;

  @ApiProperty({ type: Boolean, example: true })
  isVerifiedStay!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  isResidentVerified!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  isAnonymous!: boolean;

  @ApiProperty({ type: Number, example: 4 })
  helpfulCount!: number;

  @ApiProperty({ type: [String], example: ['https://example.com/review1.jpg'] })
  images!: string[];

  @ApiPropertyOptional({ type: () => ReviewAuthorDto, nullable: true })
  author?: ReviewAuthorDto | null;

  @ApiPropertyOptional({ type: () => ReviewUserDto, nullable: true })
  user?: ReviewUserDto | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'ONE_SEMESTER' })
  stayDuration?: string | null;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;
}

export class StudentStayResponseDto {
  @ApiProperty({ type: String, example: 'stay-rev-123' })
  id!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  pensionId!: string;

  @ApiProperty({ type: String, example: 'Residencia San Joaquín' })
  pensionTitle!: string;

  @ApiProperty({ type: String, example: 'Santiago' })
  pensionCity!: string;

  @ApiPropertyOptional({ type: String, example: 'residencia-san-joaquin' })
  pensionSlug?: string;

  @ApiProperty({ type: String, example: 'Habitación Individual' })
  roomTitle!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/pension.jpg' })
  imageUrl!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/pension.jpg' })
  featuredImage?: string | null;

  @ApiPropertyOptional({ type: String, example: 'Santiago' })
  city?: string;

  @ApiProperty({ type: Number, example: 250000 })
  monthlyPaidClp!: number;

  @ApiProperty({ type: Number, example: 5 })
  ratingGiven!: number;

  @ApiPropertyOptional({ type: Number, example: 5 })
  rating?: number;

  @ApiProperty({ type: Boolean, example: true })
  hasReview!: boolean;

  @ApiPropertyOptional({ type: String, example: 'Excelente estadía.' })
  comment?: string;

  @ApiPropertyOptional({
    enum: StayDurationCategory,
    enumName: 'StayDurationCategory',
    nullable: true,
    example: StayDurationCategory.ONE_SEMESTER,
  })
  stayDurationCategory?: StayDurationCategory | null;

  @ApiPropertyOptional({ type: () => ReviewResponseDto, nullable: true })
  review?: ReviewResponseDto | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 10 })
  stayDurationMonths?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 2025 })
  stayYear?: number | null;

  @ApiPropertyOptional({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt?: Date;
}

export class HelpfulVotesResponseDto {
  @ApiProperty({ type: [String], example: ['rev-1', 'rev-2'] })
  reviewIds!: string[];
}

export class VoteHelpfulResultResponseDto {
  @ApiProperty({ type: Number, example: 5 })
  helpfulCount!: number;

  @ApiProperty({ type: Boolean, example: true })
  voted!: boolean;
}
