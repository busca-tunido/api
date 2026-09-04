import { type ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type ErrorEnvelope, HttpExceptionFilter } from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockStatus: ReturnType<typeof vi.fn>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockResponse: Response;
  let mockRequest: Request;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
    } as unknown as Response;
    mockRequest = {
      url: '/test-endpoint',
    } as unknown as Request;

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format a standard HttpException correctly', () => {
    const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: HttpStatus.FORBIDDEN,
        path: '/test-endpoint',
        message: 'Forbidden resource',
      }),
    );
  });

  it('should handle validation errors array in exception response', () => {
    const validationErrors = ['email must be an email', 'password is too short'];
    const exception = new HttpException(
      { message: validationErrors, error: 'Bad Request', statusCode: 400 },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const sentPayload = mockJson.mock.calls[0][0] as ErrorEnvelope;
    expect(sentPayload.success).toBe(false);
    expect(sentPayload.message).toBe('Validation failed');
    expect(sentPayload.errors).toEqual(validationErrors);
  });

  it('should handle unhandled native errors with 500 status', () => {
    const error = new Error('Database connection failed');
    filter.catch(error, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const sentPayload = mockJson.mock.calls[0][0] as ErrorEnvelope;
    expect(sentPayload.success).toBe(false);
    expect(sentPayload.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(sentPayload.message).toBe('Database connection failed');
  });
});
