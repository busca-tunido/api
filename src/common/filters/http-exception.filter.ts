import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiErrorCode } from '../types/error-codes.js';

export type ErrorEnvelope = {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string;
  errorCode: ApiErrorCode;
  errors: unknown;
};

function resolveErrorCode(status: number, message: string, explicitCode?: unknown): ApiErrorCode {
  if (typeof explicitCode === 'string' && explicitCode in ApiErrorCode) {
    return explicitCode as ApiErrorCode;
  }

  const lowerMessage = message.toLowerCase();

  if (status === HttpStatus.BAD_REQUEST) {
    if (lowerMessage.includes('validation') || lowerMessage.includes('válid')) {
      return ApiErrorCode.VALIDATION_FAILED;
    }
    return ApiErrorCode.VALIDATION_FAILED;
  }

  if (status === HttpStatus.UNAUTHORIZED) {
    if (
      lowerMessage.includes('credencial') ||
      lowerMessage.includes('password') ||
      lowerMessage.includes('contraseña')
    ) {
      return ApiErrorCode.INVALID_CREDENTIALS;
    }
    return ApiErrorCode.UNAUTHORIZED;
  }

  if (status === HttpStatus.FORBIDDEN) {
    return ApiErrorCode.FORBIDDEN;
  }

  if (status === HttpStatus.NOT_FOUND) {
    if (lowerMessage.includes('pensi')) {
      return ApiErrorCode.PENSION_NOT_FOUND;
    }
    if (lowerMessage.includes('room') || lowerMessage.includes('habitaci')) {
      return ApiErrorCode.ROOM_NOT_FOUND;
    }
    if (lowerMessage.includes('review') || lowerMessage.includes('reseña')) {
      return ApiErrorCode.REVIEW_NOT_FOUND;
    }
    if (lowerMessage.includes('favorit')) {
      return ApiErrorCode.FAVORITE_NOT_FOUND;
    }
    return ApiErrorCode.NOT_FOUND;
  }

  if (status === HttpStatus.CONFLICT) {
    if (lowerMessage.includes('email') || lowerMessage.includes('correo')) {
      return ApiErrorCode.EMAIL_ALREADY_EXISTS;
    }
    if (lowerMessage.includes('review') || lowerMessage.includes('reseña')) {
      return ApiErrorCode.ALREADY_REVIEWED;
    }
    if (lowerMessage.includes('favorit')) {
      return ApiErrorCode.ALREADY_FAVORITED;
    }
    return ApiErrorCode.CONFLICT;
  }

  if (status === HttpStatus.TOO_MANY_REQUESTS) {
    return ApiErrorCode.RATE_LIMIT_EXCEEDED;
  }

  return ApiErrorCode.INTERNAL_SERVER_ERROR;
}

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
    let explicitCode: unknown;

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

        if (body.errorCode !== undefined) {
          explicitCode = body.errorCode;
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
      errorCode: resolveErrorCode(status, message, explicitCode),
      errors,
    };

    if (typeof response?.header === 'function') {
      response.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    response.status(status).send(errorPayload);
  }
}
