import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/sql-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SqlPrismaService } from '../../sql-prisma/sql-prisma.service.js';
import type { JwtPayload } from '../types/auth.types.js';
import { JwtStrategy } from './jwt.strategy.js';

type MockSqlPrismaService = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockSqlPrisma: MockSqlPrismaService;

  beforeEach(() => {
    mockSqlPrisma = {
      user: {
        findUnique: vi.fn(),
      },
    };

    strategy = new JwtStrategy(mockSqlPrisma as unknown as SqlPrismaService);
  });

  describe('validate', () => {
    it('should return sanitized user when payload belongs to an active user', async () => {
      const payload: JwtPayload = {
        sub: 'user-active-1',
        email: 'estudiante.demo@uchile.cl',
        role: Role.STUDENT,
      };

      const dbUser = {
        id: 'user-active-1',
        email: 'estudiante.demo@uchile.cl',
        firstName: 'Estudiante',
        lastName: 'Demo',
        phone: '+56912345678',
        avatarUrl: null,
        role: Role.STUDENT,
        isEmailVerified: true,
        universityId: 'uni-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSqlPrisma.user.findUnique.mockResolvedValue(dbUser);

      const result = await strategy.validate(payload);
      expect(result.id).toBe('user-active-1');
      expect(result.email).toBe('estudiante.demo@uchile.cl');
      expect(mockSqlPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-active-1' },
        select: expect.objectContaining({
          id: true,
          email: true,
          role: true,
        }),
      });
    });

    it('should throw UnauthorizedException if user account is deactivated or deleted', async () => {
      const payload: JwtPayload = {
        sub: 'user-deactivated-2',
        email: 'deleted@uchile.cl',
        role: Role.STUDENT,
      };

      mockSqlPrisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(payload)).rejects.toThrow(
        'User account not found or deactivated',
      );
    });

    it('should throw UnauthorizedException if payload sub does not exist in database', async () => {
      const payload: JwtPayload = {
        sub: 'non-existent-id',
        email: 'nonexistent@buscatunido.cl',
        role: Role.LANDLORD,
      };

      mockSqlPrisma.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
