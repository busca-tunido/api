import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GenderPreference, RoomType, VerificationStatus } from '@prisma/client';
import { BathType } from '../../rooms/dto/room-response.dto.js';

export class PensionImageResponseDto {
  @ApiProperty({ type: String, example: 'img-123' })
  id!: string;

  @ApiProperty({ type: String, example: 'https://example.com/pension.webp' })
  url!: string;

  @ApiProperty({ type: String, example: 'https://example.com/pension-thumb.webp' })
  thumbnailUrl!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Fachada frontal' })
  caption?: string | null;

  @ApiPropertyOptional({ type: Boolean, example: true })
  isFeatured?: boolean;
}

export class PensionAmenityResponseDto {
  @ApiProperty({ type: String, example: 'wifi-alta-velocidad' })
  slug!: string;

  @ApiProperty({ type: String, example: 'Wifi Alta Velocidad' })
  name!: string;
}

export class NearbyUniversityItemDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  id!: string;

  @ApiProperty({ type: String, example: 'Universidad de Chile' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCh' })
  shortName?: string | null;
}

export class PensionNearbyUniversityResponseDto {
  @ApiProperty({ type: Number, example: 450 })
  distanceMeters!: number;

  @ApiPropertyOptional({ type: Number, example: 6 })
  walkingMinutes?: number;

  @ApiProperty({ type: () => NearbyUniversityItemDto })
  university!: NearbyUniversityItemDto;
}

export class PensionRoomSummaryDto {
  @ApiProperty({ type: String, example: 'room-123' })
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '101' })
  roomNumber?: string | null;

  @ApiProperty({ type: String, example: 'Habitación Individual' })
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Habitación Individual' })
  name?: string | null;

  @ApiProperty({ enum: RoomType, enumName: 'RoomType', example: RoomType.SINGLE })
  type!: RoomType;

  @ApiProperty({ type: Number, example: 250000 })
  monthlyPrice!: number;

  @ApiPropertyOptional({ type: Number, example: 250000 })
  priceMonthlyClp?: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 100000 })
  deposit?: number | null;

  @ApiProperty({ type: Boolean, example: false })
  hasPrivateBathroom!: boolean;

  @ApiPropertyOptional({ enum: BathType, enumName: 'BathType', example: BathType.PRIVATE })
  bathType?: BathType;

  @ApiProperty({ type: Boolean, example: true })
  isAvailable!: boolean;

  @ApiPropertyOptional({ type: Boolean, example: true })
  isActive?: boolean;
}

export class PensionCountDto {
  @ApiProperty({ type: Number, example: 5 })
  rooms!: number;

  @ApiProperty({ type: Number, example: 12 })
  reviews!: number;
}

export class PensionNearestUniversitySummaryDto {
  @ApiProperty({ type: String, example: 'Universidad de Chile' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCHILE' })
  shortName?: string | null;

  @ApiProperty({ type: Number, example: 450, description: 'Distance in meters' })
  distanceMeters!: number;
}

export class PensionItemResponseDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'residencia-universitaria-san-joaquin' })
  slug!: string;

  @ApiProperty({ type: String, example: 'Residencia San Joaquín' })
  title!: string;

  @ApiProperty({ type: String, example: 'Acogedora pensión universitaria a pasos del campus.' })
  description!: string;

  @ApiProperty({ type: String, example: 'Av. Vicuña Mackenna 4860' })
  address!: string;

  @ApiProperty({ type: String, example: 'San Joaquín' })
  neighborhood!: string;

  @ApiProperty({ type: String, example: 'Santiago' })
  city!: string;

  @ApiProperty({ type: Number, example: -33.49706 })
  latitude!: number;

  @ApiProperty({ type: Number, example: -70.61459 })
  longitude!: number;

  @ApiProperty({ type: Number, example: 250000 })
  baseMonthlyPrice!: number;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 100000 })
  deposit?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Sra. Carmen Gloria' })
  contactName?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '+56 9 1234 5678' })
  contactPhone?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '+56 9 1234 5678' })
  contactWhatsapp?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'contacto@residencia.cl' })
  contactEmail?: string | null;

  @ApiProperty({ type: String, example: 'CLP' })
  currency!: string;

  @ApiProperty({ type: Boolean, example: true })
  waterIncluded!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  electricityIncluded!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  gasIncluded!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  internetIncluded!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: '23:00' })
  curfewTime?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '23:00' })
  quietHoursStart?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '07:00' })
  quietHoursEnd?: string | null;

  @ApiProperty({ type: Boolean, example: false })
  guestsAllowed!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  smokingAllowed!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  petsAllowed!: boolean;

  @ApiProperty({
    enum: GenderPreference,
    enumName: 'GenderPreference',
    example: GenderPreference.ANY,
  })
  genderPreference!: GenderPreference;

  @ApiProperty({
    enum: VerificationStatus,
    enumName: 'VerificationStatus',
    example: VerificationStatus.OFFICIALLY_VERIFIED,
  })
  verificationStatus!: VerificationStatus;

  @ApiProperty({ type: Boolean, example: true })
  isActive!: boolean;

  @ApiProperty({ type: Number, example: 4.8 })
  ratingAverage!: number;

  @ApiPropertyOptional({ type: Number, example: 4.8 })
  averageRating?: number;

  @ApiProperty({ type: Number, example: 12 })
  ratingCount!: number;

  @ApiProperty({ type: Number, example: 12 })
  reviewsCount!: number;

  @ApiPropertyOptional({ type: Number, example: 1.2 })
  distanceKm?: number;

  @ApiPropertyOptional({ type: Number, example: 94.5 })
  relevanceScore?: number;

  @ApiProperty({ type: () => [PensionImageResponseDto] })
  images!: PensionImageResponseDto[];

  @ApiProperty({ type: () => [PensionAmenityResponseDto] })
  amenities!: PensionAmenityResponseDto[];

  @ApiProperty({ type: () => [PensionNearbyUniversityResponseDto] })
  nearbyUniversities!: PensionNearbyUniversityResponseDto[];

  @ApiPropertyOptional({ type: () => PensionNearestUniversitySummaryDto })
  nearestUniversity?: PensionNearestUniversitySummaryDto;

  @ApiPropertyOptional({ type: [String], example: ['wifi-alta-velocidad', 'comida-incluida'] })
  amenitySlugs?: string[];

  @ApiProperty({ type: () => [PensionRoomSummaryDto] })
  rooms!: PensionRoomSummaryDto[];

  @ApiProperty({ type: () => PensionCountDto })
  _count!: PensionCountDto;
}

export class NearbyCityCountDto {
  @ApiProperty({ type: String, example: 'Valparaíso' })
  city!: string;

  @ApiProperty({ type: Number, example: 15 })
  count!: number;

  @ApiPropertyOptional({ type: Number, example: 110.5 })
  distanceKm?: number;
}

export class PriceHistogramBinDto {
  @ApiProperty({ type: Number, example: 150000 })
  min!: number;

  @ApiProperty({ type: Number, example: 180000 })
  max!: number;

  @ApiProperty({ type: Number, example: 8 })
  count!: number;
}

export class PriceHistogramResponseDto {
  @ApiPropertyOptional({ type: Number, nullable: true, example: 150000 })
  minPrice!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 500000 })
  maxPrice!: number | null;

  @ApiProperty({ type: String, example: 'CLP' })
  currency!: string;

  @ApiProperty({ type: Number, example: 45 })
  totalListings!: number;

  @ApiProperty({ type: () => [PriceHistogramBinDto] })
  bins!: PriceHistogramBinDto[];
}

export class CitySummaryResponseDto {
  @ApiProperty({ type: String, example: 'santiago' })
  id!: string;

  @ApiProperty({ type: String, example: 'Santiago' })
  name!: string;

  @ApiProperty({ type: Number, example: 38 })
  pensionsCount!: number;

  @ApiProperty({ type: Number, example: -33.44889 })
  latitude!: number;

  @ApiProperty({ type: Number, example: -70.669265 })
  longitude!: number;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'https://example.com/santiago.webp',
  })
  imageUrl?: string | null;
}

export class DeleteResultResponseDto {
  @ApiPropertyOptional({ type: String, example: '6659f8c123456789abcdef01' })
  id?: string;

  @ApiProperty({ type: Boolean, example: true })
  deleted!: boolean;
}
