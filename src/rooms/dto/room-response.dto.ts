import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType } from '@prisma/client';

export class RoomResponseDto {
  @ApiProperty({ type: String, example: 'room-123' })
  id!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  pensionId!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '101' })
  roomNumber?: string | null;

  @ApiProperty({ type: String, example: 'Habitación Individual Luminosa' })
  title!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Habitación Individual Luminosa' })
  name?: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Pieza amoblada con clóset y escritorio.',
  })
  description?: string | null;

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

  @ApiProperty({ type: Number, example: 1 })
  totalBeds!: number;

  @ApiProperty({ type: Number, example: 1 })
  availableBeds!: number;

  @ApiProperty({ type: Boolean, example: true })
  isAvailable!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-03-01' })
  availableFrom?: string | null;

  @ApiProperty({ type: [String], example: ['https://example.com/room1.jpg'] })
  images!: string[];

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  updatedAt!: Date;
}
