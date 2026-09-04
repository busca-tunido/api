import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export type ErrorEnvelope = {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  errors: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        if (typeof body.message === 'string') {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = 'Validation failed';
          errors = body.message;
        } else if (body.error && typeof body.error === 'string') {
          message = body.error;
        }

        if (body.errors !== undefined) {
          errors = body.errors;
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = exception.message;
    } else {
      this.logger.error('Unknown exception caught', String(exception));
    }

    const errorPayload: ErrorEnvelope = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url || '',
      message,
      errors,
    };

    response.status(status).json(errorPayload);
  }
}
