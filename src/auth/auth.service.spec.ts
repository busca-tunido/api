import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UniversitiesService } from '../universities/universities.service.js';
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

type MockUniversitiesService = {
  findByEmailDomain: ReturnType<typeof vi.fn>;
};

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: MockPrismaService;
  let mockJwtService: MockJwtService;
  let mockUniversitiesService: MockUniversitiesService;

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

    mockUniversitiesService = {
      findByEmailDomain: vi.fn(),
    };

    service = new AuthService(
      mockPrisma as unknown as PrismaService,
      mockJwtService as unknown as JwtService,
      mockUniversitiesService as unknown as UniversitiesService,
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUniversitiesService.findByEmailDomain.mockResolvedValue({
        id: 'uni-1',
        name: 'Universidad de Chile',
        shortName: 'UCH',
        city: 'Santiago',
        address: 'Av. Libertador Bernardo O Higgins 1058',
      });
      const createdUser = {
        id: 'user-1',
        email: 'test@uchile.cl',
        firstName: 'Test',
        lastName: 'User',
        phone: null,
        avatarUrl: null,
        role: Role.STUDENT,
        isEmailVerified: false,
        universityId: 'uni-1',
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
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@uchile.cl',
        role: Role.STUDENT,
      });
      expect(mockUniversitiesService.findByEmailDomain).toHaveBeenCalledWith('test@uchile.cl');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@uchile.cl',
          role: Role.STUDENT,
          universityId: 'uni-1',
        }),
        select: expect.any(Object),
      });
    });

    it('should automatically bind universityId when registering student with valid domain', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUniversitiesService.findByEmailDomain.mockResolvedValue({
        id: 'uni-uchile',
        name: 'Universidad de Chile',
        shortName: 'UCH',
        city: 'Santiago',
        address: 'Av. Libertador Bernardo O Higgins 1058',
      });
      const createdUser = {
        id: 'student-1',
        email: 'estudiante@uchile.cl',
        firstName: 'Estudiante',
        lastName: 'Prueba',
        phone: null,
        avatarUrl: null,
        role: Role.STUDENT,
        isEmailVerified: false,
        universityId: 'uni-uchile',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'estudiante@uchile.cl',
        password: 'password123',
        firstName: 'Estudiante',
        lastName: 'Prueba',
      });

      expect(result.user.universityId).toBe('uni-uchile');
      expect(mockUniversitiesService.findByEmailDomain).toHaveBeenCalledWith(
        'estudiante@uchile.cl',
      );
    });

    it('should throw BadRequestException if student email domain is not registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUniversitiesService.findByEmailDomain.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'user@unknown.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'Unknown',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'El correo institucional no pertenece a una universidad registrada en BuscaTuNido.',
        ),
      );
    });

    it('should register landlord without enforcing institutional email domain', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const createdUser = {
        id: 'landlord-1',
        email: 'owner@gmail.com',
        firstName: 'Land',
        lastName: 'Lord',
        phone: null,
        avatarUrl: null,
        role: Role.LANDLORD,
        isEmailVerified: false,
        universityId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register({
        email: 'owner@gmail.com',
        password: 'password123',
        firstName: 'Land',
        lastName: 'Lord',
        role: Role.LANDLORD,
      });

      expect(result.user.role).toBe(Role.LANDLORD);
      expect(mockUniversitiesService.findByEmailDomain).not.toHaveBeenCalled();
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

    it('should throw BadRequestException if registering with MODERATOR role', async () => {
      await expect(
        service.register({
          email: 'mod@buscatunido.cl',
          password: 'password123',
          firstName: 'Mod',
          lastName: 'User',
          role: Role.MODERATOR as unknown as Role.STUDENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if registering with ADMIN role', async () => {
      await expect(
        service.register({
          email: 'admin@buscatunido.cl',
          password: 'password123',
          firstName: 'Admin',
          lastName: 'User',
          role: Role.ADMIN as unknown as Role.STUDENT,
        }),
      ).rejects.toThrow(BadRequestException);
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
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@uchile.cl',
        role: Role.STUDENT,
      });
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

    it('should never expose passwordHash and ensure field sanitization', async () => {
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
      expect(profile).not.toHaveProperty('passwordHash');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
        select: expect.objectContaining({
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        }),
      });
    });

    it('should throw NotFoundException if user account is deactivated/deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('deactivated-user-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'deactivated-user-id', deletedAt: null },
        select: expect.any(Object),
      });
    });
  });

  describe('checkEmail', () => {
    it('should return exists: true without disclosing role when email is found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        deletedAt: null,
      });

      const result = await service.checkEmail('ESTUDIANTE.DEMO@UCHILE.CL ');
      expect(result).toEqual({ exists: true });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'estudiante.demo@uchile.cl' },
        select: { id: true, deletedAt: true },
      });
      expect(mockUniversitiesService.findByEmailDomain).not.toHaveBeenCalled();
    });

    it('should return exists: false with detectedUniversity when email is not found but domain matches', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUniversitiesService.findByEmailDomain.mockResolvedValue({
        id: 'uni-1',
        name: 'Universidad de Chile',
        shortName: 'UCH',
        city: 'Santiago',
        address: 'Av. Libertador Bernardo O Higgins 1058',
      });

      const result = await service.checkEmail('nuevo.estudiante@uchile.cl');
      expect(result).toEqual({
        exists: false,
        detectedUniversity: {
          id: 'uni-1',
          name: 'Universidad de Chile',
          shortName: 'UCH',
          city: 'Santiago',
        },
      });
      expect(mockUniversitiesService.findByEmailDomain).toHaveBeenCalledWith(
        'nuevo.estudiante@uchile.cl',
      );
    });

    it('should return exists: false and detectedUniversity: null when domain is unrecognized', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockUniversitiesService.findByEmailDomain.mockResolvedValue(null);

      const result = await service.checkEmail('unregistered@gmail.com');
      expect(result).toEqual({
        exists: false,
        detectedUniversity: null,
      });
      expect(mockUniversitiesService.findByEmailDomain).toHaveBeenCalledWith(
        'unregistered@gmail.com',
      );
    });

    it('should return exists: false when user is deactivated/deleted and resolve domain', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: Role.STUDENT,
        deletedAt: new Date(),
      });
      mockUniversitiesService.findByEmailDomain.mockResolvedValue(null);

      const result = await service.checkEmail('deleted@uchile.cl');
      expect(result).toEqual({ exists: false, detectedUniversity: null });
      expect(mockUniversitiesService.findByEmailDomain).toHaveBeenCalledWith('deleted@uchile.cl');
    });
  });
});
