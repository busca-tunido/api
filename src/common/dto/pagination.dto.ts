import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ type: Number, example: 1 })
  page!: number;

  @ApiProperty({ type: Number, example: 20 })
  limit!: number;

  @ApiProperty({ type: Number, example: 45 })
  total!: number;

  @ApiProperty({ type: Number, example: 3 })
  totalPages!: number;

  @ApiProperty({ type: Boolean, example: true })
  hasMore!: boolean;
}
