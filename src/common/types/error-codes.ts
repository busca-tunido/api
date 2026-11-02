import { ApiProperty } from '@nestjs/swagger';

export enum ApiErrorCode {
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  PENSION_NOT_FOUND = 'PENSION_NOT_FOUND',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  REVIEW_NOT_FOUND = 'REVIEW_NOT_FOUND',
  ALREADY_REVIEWED = 'ALREADY_REVIEWED',
  ALREADY_FAVORITED = 'ALREADY_FAVORITED',
  FAVORITE_NOT_FOUND = 'FAVORITE_NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CONFLICT = 'CONFLICT',
}

export class ErrorEnvelopeDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: '2026-11-02T01:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/api/auth/login' })
  path!: string;

  @ApiProperty({ example: 'Credenciales incorrectas' })
  message!: string;

  @ApiProperty({
    enum: ApiErrorCode,
    enumName: 'ApiErrorCode',
    example: ApiErrorCode.INVALID_CREDENTIALS,
  })
  errorCode!: ApiErrorCode;

  @ApiProperty({ required: false, nullable: true })
  errors?: unknown;
}
