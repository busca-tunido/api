import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export type ReviewAction = 'APPROVE' | 'REJECT' | 'MODIFY_AND_APPROVE';

export class ReviewProposalDto {
  @ApiProperty({
    enum: ['APPROVE', 'REJECT', 'MODIFY_AND_APPROVE'],
    example: 'APPROVE',
  })
  @IsIn(['APPROVE', 'REJECT', 'MODIFY_AND_APPROVE'])
  action!: ReviewAction;

  @ApiPropertyOptional({ example: 'Cambios validados telefónicamente.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;

  @ApiPropertyOptional({
    example: { curfewTime: '23:30' },
    description: 'Subset or override of changes to apply when action is MODIFY_AND_APPROVE',
  })
  @IsOptional()
  @IsObject()
  modifiedChanges?: Record<string, unknown>;
}
