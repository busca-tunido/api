import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { UniversitiesService } from '../universities/universities.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type {
  AuthResponse,
  CheckEmailResponse,
  DetectedUniversityDto,
  JwtPayload,
  SanitizedUser,
} from './types/auth.types.js';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isEmailVerified: true,
  universityId: true,
  university: {
    select: {
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type SelectedUserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isEmailVerified: boolean;
  universityId: string | null;
  university?: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

function toSanitizedUser(user: SelectedUserProfile): SanitizedUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    universityId: user.universityId,
    universityName: user.university?.name ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly universitiesService: UniversitiesService,
  ) {}

  private async resolveUniversityForRole(
    targetRole: Role,
    rawEmail: string,
    requestedUniversityId?: string,
  ): Promise<string | null> {
    if (targetRole === Role.STUDENT) {
      const detectedUniversity = await this.universitiesService.findByEmailDomain(rawEmail);
      return detectedUniversity?.id ?? null;
    }

    if (requestedUniversityId) {
      const university = await this.prisma.university.findUnique({
        where: { id: requestedUniversityId },
        select: { id: true },
      });
      return university ? requestedUniversityId : null;
    }

    return null;
  }

  private buildAuthResponse(user: SelectedUserProfile): AuthResponse {
    const sanitizedUser = toSanitizedUser(user);
    return {
      user: sanitizedUser,
      accessToken: this.generateToken(sanitizedUser),
    };
  }

  async register(dto: RegisterDto): Promise<AuthResponse> {
    if (dto.role && dto.role !== Role.STUDENT && dto.role !== Role.LANDLORD) {
      throw new BadRequestException('Privileged roles cannot be registered through public signup');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const targetRole = dto.role || Role.STUDENT;

    const [existing, resolvedUniversityId] = await Promise.all([
      this.prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      }),
      this.resolveUniversityForRole(targetRole, dto.email, dto.universityId),
    ]);

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (targetRole === Role.STUDENT && !resolvedUniversityId) {
      throw new BadRequestException(
        'El correo institucional no pertenece a una universidad registrada en BuscaTuNido.',
      );
    }

    if (targetRole === Role.LANDLORD && dto.universityId && !resolvedUniversityId) {
      throw new NotFoundException('University not found');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phone: dto.phone?.trim() || null,
        role: targetRole,
        universityId: resolvedUniversityId,
      },
      select: USER_PROFILE_SELECT,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        ...USER_PROFILE_SELECT,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return toSanitizedUser(user);
  }

  async checkEmail(email: string): Promise<CheckEmailResponse> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, deletedAt: true },
    });

    if (user && user.deletedAt === null) {
      return {
        exists: true,
      };
    }

    const detected = await this.universitiesService.findByEmailDomain(normalizedEmail);
    const detectedUniversity: DetectedUniversityDto | null = detected
      ? {
          id: detected.id,
          name: detected.name,
          shortName: detected.shortName,
          city: detected.city,
        }
      : null;

    return {
      exists: false,
      detectedUniversity,
    };
  }

  private generateToken(user: SanitizedUser): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
