import { type CustomDecorator, SetMetadata } from '@nestjs/common';
import type { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]): CustomDecorator<string> => SetMetadata(ROLES_KEY, roles);
