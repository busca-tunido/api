import { ApiProperty } from '@nestjs/swagger';
import { ReportReason } from '@prisma/client';
import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID()
  pensionId!: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.INACCURATE_PRICE })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @ApiProperty({ example: 'El precio cobrado no coincide con el publicado en el sitio web.' })
  @IsString()
  @MinLength(10)
  description!: string;
}
