import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockReflector: { getAllAndOverride: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockReflector = {
      getAllAndOverride: vi.fn(),
    };
    guard = new RolesGuard(mockReflector as unknown as Reflector);
  });

  it('should allow access if no roles are defined', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user: { role: Role.STUDENT } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow access if user has one of the required roles', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.MODERATOR]);
    const mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user: { role: Role.ADMIN } }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException if user has an insufficient role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN]);
    const mockContext = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({ user: { role: Role.STUDENT } }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
