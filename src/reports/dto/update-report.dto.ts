import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateReportDto {
  @ApiPropertyOptional({ enum: ReportStatus, example: ReportStatus.RESOLVED })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional({ example: 'Se contactó al arrendador y se corrigió el precio publicado.' })
  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
