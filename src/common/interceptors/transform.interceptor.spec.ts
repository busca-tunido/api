import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { TransformInterceptor } from './transform.interceptor.js';

describe('TransformInterceptor', () => {
  it('should wrap response data in standard envelope', async () => {
    const interceptor = new TransformInterceptor<string>();
    const mockResponse = { statusCode: 200 } as Response;
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler: CallHandler<string> = {
      handle: () => of('test payload'),
    };

    const result = await firstValueFrom(interceptor.intercept(mockContext, mockCallHandler));

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data).toBe('test payload');
    expect(typeof result.timestamp).toBe('string');
  });
});
