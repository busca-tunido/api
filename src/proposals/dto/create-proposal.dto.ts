import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProposalDto {
  @ApiProperty({ enum: ProposalType, default: ProposalType.BASIC_INFO })
  @IsEnum(ProposalType)
  type!: ProposalType;

  @ApiProperty({
    example: {
      curfewTime: '23:30',
      quietHoursStart: '22:00',
      amenitiesToAdd: ['sala-estudio'],
      amenitiesToRemove: [],
    },
    description: 'Object with proposed field corrections or amenities diff',
  })
  @IsObject()
  proposedChanges!: Record<string, unknown>;

  @ApiPropertyOptional({ example: 'Actualización tras consulta presencial.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  submissionNotes?: string;
}
