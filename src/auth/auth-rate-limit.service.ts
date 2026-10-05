import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { env } from '../env.js';

export type LoginAttemptEntry = {
  count: number;
  lastAttemptAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly loginAttempts = new Map<string, LoginAttemptEntry>();
  private readonly checkEmailAttempts = new Map<string, number[]>();

  private readonly MAX_FREE_ATTEMPTS = 5;
  private readonly MAX_CAPTCHA_ATTEMPTS = 10;
  private readonly COOLING_PERIOD_MS = 2 * 60 * 1000;
  private readonly CHECK_EMAIL_LIMIT = 30;
  private readonly CHECK_EMAIL_WINDOW_MS = 60 * 1000;

  getCompositeKey(ip: string, email: string): string {
    const cleanIp = ip || 'unknown-ip';
    const cleanEmail = (email || '').toLowerCase().trim();
    return `${cleanIp}:${cleanEmail}`;
  }

  async assertLoginAllowed(ip: string, email: string, turnstileToken?: string): Promise<void> {
    const key = this.getCompositeKey(ip, email);
    const entry = this.loginAttempts.get(key);

    if (!entry) {
      return;
    }

    const now = Date.now();

    if (entry.count >= this.MAX_CAPTCHA_ATTEMPTS) {
      const elapsed = now - entry.lastAttemptAt;
      if (elapsed < this.COOLING_PERIOD_MS) {
        const retryAfterSeconds = Math.ceil((this.COOLING_PERIOD_MS - elapsed) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Has tenido varios intentos fallidos. Por tu seguridad, por favor espera ${retryAfterSeconds} segundos o recupera tu contraseña.`,
            retryAfterSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      entry.count = this.MAX_FREE_ATTEMPTS;
    }

    if (entry.count >= this.MAX_FREE_ATTEMPTS) {
      const isTurnstileValid = await this.verifyTurnstile(turnstileToken, ip);
      if (!isTurnstileValid) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message:
              'Por motivos de seguridad, se requiere verificación humana tras varios intentos.',
            requiresCaptcha: true,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  recordFailedLogin(ip: string, email: string): number {
    const key = this.getCompositeKey(ip, email);
    const entry = this.loginAttempts.get(key);
    const now = Date.now();

    if (entry) {
      entry.count += 1;
      entry.lastAttemptAt = now;
      return entry.count;
    }

    this.loginAttempts.set(key, {
      count: 1,
      lastAttemptAt: now,
    });
    return 1;
  }

  resetLoginAttempts(ip: string, email: string): void {
    const key = this.getCompositeKey(ip, email);
    this.loginAttempts.delete(key);
  }

  assertCheckEmailRateLimit(ip: string): void {
    const cleanIp = ip || 'unknown-ip';
    const now = Date.now();
    const timestamps = this.checkEmailAttempts.get(cleanIp) || [];
    const validTimestamps = timestamps.filter((t) => now - t < this.CHECK_EMAIL_WINDOW_MS);

    if (validTimestamps.length >= this.CHECK_EMAIL_LIMIT) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Demasiadas consultas de correo. Por favor espera un momento.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    validTimestamps.push(now);
    this.checkEmailAttempts.set(cleanIp, validTimestamps);
  }

  async verifyTurnstile(token?: string, remoteIp?: string): Promise<boolean> {
    if (env.NODE_ENV !== 'production') {
      return true;
    }

    if (!token || token.trim().length === 0) {
      return false;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', env.TURNSTILE_SECRET_KEY);
      formData.append('response', token.trim());
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });

      const outcome = (await res.json()) as { success: boolean };
      return Boolean(outcome?.success);
    } catch {
      return false;
    }
  }
}
