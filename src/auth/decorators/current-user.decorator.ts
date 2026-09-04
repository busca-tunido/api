import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SanitizedUser } from '../types/auth.types.js';

export const CurrentUser = createParamDecorator(
  (data: keyof SanitizedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: SanitizedUser }>();
    const user = request.user;
    return data && user ? user[data] : user;
  },
);
