import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProposalStatus, ProposalType } from '@prisma/client';
import { PaginationMetaDto } from '../../common/dto/pagination.dto.js';

export class ProposalUserDto {
  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  id!: string;

  @ApiProperty({ type: String, example: 'Carlos' })
  firstName!: string;

  @ApiProperty({ type: String, example: 'Gómez' })
  lastName!: string;

  @ApiPropertyOptional({ type: String, example: 'carlos@uchile.cl' })
  email?: string;
}

export class ProposalResponseDto {
  @ApiProperty({ type: String, example: 'prop-123' })
  id!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef01' })
  pensionId!: string;

  @ApiProperty({ type: String, example: '6659f8c123456789abcdef02' })
  submittedById!: string;

  @ApiProperty({
    enum: ProposalType,
    enumName: 'ProposalType',
    example: ProposalType.BASIC_INFO,
  })
  type!: ProposalType;

  @ApiProperty({
    enum: ProposalStatus,
    enumName: 'ProposalStatus',
    example: ProposalStatus.PENDING,
  })
  status!: ProposalStatus;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { baseMonthlyPrice: 280000 },
  })
  proposedChanges!: Record<string, unknown>;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'El dueño actualizó los precios.' })
  submissionNotes?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'Verificado con el propietario.' })
  reviewNotes?: string | null;

  @ApiProperty({ type: () => ProposalUserDto })
  submittedBy!: ProposalUserDto;

  @ApiPropertyOptional({ type: () => ProposalUserDto, nullable: true })
  reviewedBy?: ProposalUserDto | null;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ type: Date, example: '2026-03-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedProposalsResponseDto {
  @ApiProperty({ type: () => [ProposalResponseDto] })
  items!: ProposalResponseDto[];

  @ApiProperty({ type: () => PaginationMetaDto })
  pagination!: PaginationMetaDto;

  @ApiProperty({ type: Number, example: 5 })
  total!: number;

  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  limit!: number;

  @ApiProperty({ type: Number, example: 1 })
  totalPages!: number;

  @ApiPropertyOptional({ type: Boolean, example: false })
  hasMore?: boolean;
}
