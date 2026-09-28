import {
  type CallHandler,
  type CustomDecorator,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyReply } from 'fastify';
import type { Observable } from 'rxjs';

export const CACHE_CONTROL_METADATA_KEY = 'cache_control:options';

export interface CacheControlOptions {
  maxAgeSeconds: number;
  staleWhileRevalidateSeconds?: number;
}

export function CacheControl(
  maxAgeSeconds: number,
  staleWhileRevalidateSeconds?: number,
): CustomDecorator<string>;
export function CacheControl(options: CacheControlOptions): CustomDecorator<string>;
export function CacheControl(
  maxAgeSecondsOrOptions: number | CacheControlOptions,
  staleWhileRevalidateSeconds?: number,
): CustomDecorator<string> {
  if (typeof maxAgeSecondsOrOptions === 'number') {
    return SetMetadata(CACHE_CONTROL_METADATA_KEY, {
      maxAgeSeconds: maxAgeSecondsOrOptions,
      staleWhileRevalidateSeconds,
    });
  }
  return SetMetadata(CACHE_CONTROL_METADATA_KEY, maxAgeSecondsOrOptions);
}

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  private readonly defaultMaxAge?: number;
  private readonly defaultStaleWhileRevalidate?: number;

  constructor(
    @Optional()
    private readonly reflector?: Reflector,
  ) {}

  intercept<T>(context: ExecutionContext, next: CallHandler<T>): Observable<T> {
    const http = context.switchToHttp();
    const response = http.getResponse<FastifyReply>();

    const metadata =
      this.reflector?.getAllAndOverride<CacheControlOptions | undefined>(
        CACHE_CONTROL_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ??
      this.reflector?.get<CacheControlOptions | undefined>(
        CACHE_CONTROL_METADATA_KEY,
        context.getHandler(),
      );

    let maxAge = 3600;
    let stale: number | undefined = 86400;

    if (metadata) {
      maxAge = metadata.maxAgeSeconds;
      stale = metadata.staleWhileRevalidateSeconds;
    } else if (this.defaultMaxAge !== undefined) {
      maxAge = this.defaultMaxAge;
      stale = this.defaultStaleWhileRevalidate;
    }

    const headerValue =
      stale !== undefined
        ? `public, max-age=${maxAge}, stale-while-revalidate=${stale}`
        : `public, max-age=${maxAge}`;

    if (response) {
      if (typeof response.header === 'function') {
        response.header('Cache-Control', headerValue);
      } else if (
        typeof (response as unknown as { setHeader?: (name: string, value: string) => void })
          .setHeader === 'function'
      ) {
        (response as unknown as { setHeader: (name: string, value: string) => void }).setHeader(
          'Cache-Control',
          headerValue,
        );
      }
    }

    return next.handle();
  }
}
