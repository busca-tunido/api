import type { Role } from '@prisma/client';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
};

export type SanitizedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  isEmailVerified: boolean;
  universityId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthResponse = {
  user: SanitizedUser;
  accessToken: string;
};

export type DetectedUniversityDto = {
  id: string;
  name: string;
  shortName: string | null;
  city: string;
};

export type CheckEmailResponse = {
  exists: boolean;
  role?: Role;
  detectedUniversity?: DetectedUniversityDto | null;
};
