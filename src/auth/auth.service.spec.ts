import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

type MockPrismaService = {
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  university: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

type MockJwtService = {
  sign: ReturnType<typeof vi.fn>;
};

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: MockPrismaService;
  let mockJwtService: MockJwtService;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      university: {
        findUnique: vi.fn(),
      },
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: 'user-1',
        email: 'test@uchile.cl',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatarUrl: null,
        role: Role.STUDENT,
        isEmailVerified: false,
        universityId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'test@uchile.cl',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@uchile.cl');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email is already taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        service.register({
          email: 'taken@uchile.cl',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should log in with correct credentials', async () => {
      const hashedPassword = await bcrypt.hash('secretPass123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@uchile.cl',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatarUrl: null,
        role: Role.STUDENT,
        isEmailVerified: true,
        universityId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login({
        email: 'test@uchile.cl',
        password: 'secretPass123',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-1');
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('secretPass123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@uchile.cl',
        passwordHash: hashedPassword,
      });

      await expect(
        service.login({
          email: 'test@uchile.cl',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@uchile.cl',
          password: 'anyPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return sanitized profile for existing user', async () => {
      const user = {
        id: 'user-1',
        email: 'test@uchile.cl',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatarUrl: null,
        role: Role.STUDENT,
        isEmailVerified: true,
        universityId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const profile = await service.getProfile('user-1');
      expect(profile.id).toBe('user-1');
      expect(profile.email).toBe('test@uchile.cl');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('non-existing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
