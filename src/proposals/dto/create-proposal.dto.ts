import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalType } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProposalDto {
  @ApiProperty({ enum: ProposalType, default: ProposalType.BASIC_INFO })
  @IsEnum(ProposalType)
  type!: ProposalType;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
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

  @ApiPropertyOptional({ example: 'Actualización tras consulta presencial.', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Las notas de la sugerencia no pueden superar los 500 caracteres' })
  submissionNotes?: string;
}
