import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

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
      const err = exception as Error & { code?: string; statusCode?: number };

      if (
        err.code === 'ERR_STREAM_PREMATURE_CLOSE' ||
        err.code === 'FST_MP_PREMATURE_CLOSE' ||
        err.message?.toLowerCase().includes('premature close')
      ) {
        status = HttpStatus.BAD_REQUEST;
        message =
          'La conexión se interrumpió durante la subida de datos. Por favor, intenta nuevamente.';
      } else if (err.code === 'FST_REQ_FILE_TOO_LARGE' || err.code === 'FST_FILES_LIMIT') {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'El archivo supera el tamaño máximo permitido de 8MB.';
      } else if (
        typeof err.statusCode === 'number' &&
        err.statusCode >= 400 &&
        err.statusCode < 500
      ) {
        status = err.statusCode;
        message = err.message || 'Solicitud no válida';
      } else {
        this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
        message = 'Internal server error';
      }
    } else {
      this.logger.error('Unknown exception caught', String(exception));
      message = 'Internal server error';
    }

    const errorPayload: ErrorEnvelope = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request?.url || '',
      message,
      errors,
    };

    response.status(status).send(errorPayload);
  }
}
