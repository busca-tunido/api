import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';

export class ReportPensionSummaryDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'Residencia San Joaquín' })
  title!: string;

  @ApiProperty({ type: String, example: 'residencia-san-joaquin' })
  slug!: string;
}

export class ReportUserSummaryDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  id!: string;

  @ApiProperty({ type: String, example: 'estudiante@uchile.cl' })
  email!: string;

  @ApiProperty({ type: String, example: 'Carlos' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Gómez' })
  lastName!: string;
}

export class ReportResponseDto {
  @ApiProperty({ type: String, example: 'rep-123' })
  id!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  pensionId!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  userId!: string;

  @ApiProperty({ type: String, example: 'INCORRECT_INFORMATION' })
  reason!: string;

  @ApiProperty({ type: String, example: 'La dirección informada no corresponde a la realidad.' })
  description!: string;

  @ApiProperty({ enum: ReportStatus, enumName: 'ReportStatus', example: ReportStatus.PENDING })
  status!: ReportStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Se contactó al dueño y se corrigió.',
  })
  resolutionNotes?: string | null;

  @ApiPropertyOptional({ type: () => ReportPensionSummaryDto })
  pension?: ReportPensionSummaryDto;

  @ApiPropertyOptional({ type: () => ReportUserSummaryDto })
  user?: ReportUserSummaryDto;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  updatedAt!: Date;
}
