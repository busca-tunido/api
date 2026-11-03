import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class SanitizedUserResponseDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'estudiante.demo@uchile.cl' })
  email!: string;

  @ApiProperty({ type: String, example: 'Juan' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Pérez' })
  lastName!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '+56912345678' })
  phone!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'https://example.com/avatar.jpg' })
  avatarUrl!: string | null;

  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.STUDENT })
  role!: Role;

  @ApiProperty({ type: Boolean, example: true })
  isEmailVerified!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: '6659f8c123456789abcdef02' })
  universityId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Universidad de Chile' })
  universityName?: string | null;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class AuthResponseDto {
  @ApiProperty({ type: () => SanitizedUserResponseDto })
  user!: SanitizedUserResponseDto;

  @ApiProperty({ type: String, example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;
}

export class DetectedUniversityResponseDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  id!: string;

  @ApiProperty({ type: String, example: 'Universidad de Chile' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'UCh' })
  shortName!: string | null;

  @ApiProperty({ type: String, example: 'Santiago' })
  city!: string;
}

export class CheckEmailResponseDto {
  @ApiProperty({ type: Boolean, example: false })
  exists!: boolean;

  @ApiPropertyOptional({ enum: Role, enumName: 'Role', example: Role.STUDENT })
  role?: Role;

  @ApiPropertyOptional({ type: () => DetectedUniversityResponseDto, nullable: true })
  detectedUniversity?: DetectedUniversityResponseDto | null;
}
