import { ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationStatus } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePensionStatusDto {
  @ApiPropertyOptional({ enum: VerificationStatus, example: VerificationStatus.COMMUNITY_VERIFIED })
  @IsOptional()
  @IsEnum(VerificationStatus)
  verificationStatus?: VerificationStatus;

  @ApiPropertyOptional({
    example: false,
    description: 'Set false to suspend or delist the pension',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Publicación suspendida por reporte fundado de fraude.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
