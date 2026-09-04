import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { SanitizedUser } from '../types/auth.types.js';

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: SanitizedUser;
      params: Record<string, string>;
      body?: Record<string, unknown>;
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User authentication required');
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    const targetUserId = request.params.userId || request.params.id;
    if (targetUserId && targetUserId !== user.id) {
      throw new ForbiddenException('You can only access or modify your own resources');
    }

    if (
      request.body &&
      typeof request.body.userId === 'string' &&
      request.body.userId !== user.id
    ) {
      throw new ForbiddenException('You cannot assign resources to another user');
    }

    return true;
  }
}
