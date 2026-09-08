import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export type ResponseEnvelope<T> = {
  success: true;
  statusCode: number;
  timestamp: string;
  data: T;
};

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ResponseEnvelope<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    return next.handle().pipe(
      map((data: T) => ({
        success: true,
        statusCode: response?.statusCode ?? 200,
        timestamp: new Date().toISOString(),
        data,
      })),
    );
  }
}
