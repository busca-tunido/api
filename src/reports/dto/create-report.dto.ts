import { ApiProperty } from '@nestjs/swagger';
import { ReportReason } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: '6659f8c123456789abcdef01' })
  @IsString()
  pensionId!: string;

  @ApiProperty({ enum: ReportReason, example: ReportReason.INACCURATE_PRICE })
  @IsEnum(ReportReason)
  reason!: ReportReason;

  @ApiProperty({ example: 'El precio cobrado no coincide con el publicado en el sitio web.' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;
}
