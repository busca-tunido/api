import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { OwnershipGuard } from './ownership.guard.js';

describe('OwnershipGuard', () => {
  const guard = new OwnershipGuard();

  it('should allow ADMIN access to any resource', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'admin-id', role: Role.ADMIN },
          params: { id: 'other-user-id' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow user access to their own resource via route params', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123', role: Role.STUDENT },
          params: { id: 'user-123' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException if user tries to access another user resource', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123', role: Role.STUDENT },
          params: { id: 'user-456' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if body userId does not match authenticated user', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-123', role: Role.STUDENT },
          params: {},
          body: { userId: 'user-456' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
