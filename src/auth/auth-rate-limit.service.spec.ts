import { HttpException, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthRateLimitService } from './auth-rate-limit.service.js';

describe('AuthRateLimitService', () => {
  let service: AuthRateLimitService;

  beforeEach(() => {
    service = new AuthRateLimitService();
  });

  describe('login rate limiting', () => {
    it('should allow first 5 attempts without any friction', async () => {
      const ip = '192.168.1.1';
      const email = 'estudiante@uchile.cl';

      for (let i = 0; i < 5; i++) {
        await expect(service.assertLoginAllowed(ip, email)).resolves.toBeUndefined();
        service.recordFailedLogin(ip, email);
      }
    });

    it('should reset failed login attempts upon successful login', async () => {
      const ip = '192.168.1.1';
      const email = 'estudiante@uchile.cl';

      for (let i = 0; i < 4; i++) {
        service.recordFailedLogin(ip, email);
      }

      service.resetLoginAttempts(ip, email);
      await expect(service.assertLoginAllowed(ip, email)).resolves.toBeUndefined();
    });

    it('should isolate composite keys by ip and email', async () => {
      const ip = '200.1.1.1';
      const emailA = 'alumno1@uchile.cl';
      const emailB = 'alumno2@uchile.cl';

      for (let i = 0; i < 5; i++) {
        service.recordFailedLogin(ip, emailA);
      }

      await expect(service.assertLoginAllowed(ip, emailB)).resolves.toBeUndefined();
    });

    it('should enforce cooling period after 10 failed attempts', async () => {
      const ip = '192.168.1.100';
      const email = 'spam@bot.com';

      for (let i = 0; i < 10; i++) {
        service.recordFailedLogin(ip, email);
      }

      await expect(service.assertLoginAllowed(ip, email)).rejects.toThrow(HttpException);

      try {
        await service.assertLoginAllowed(ip, email);
      } catch (err) {
        expect(err).toBeInstanceOf(HttpException);
        const httpError = err as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        const response = httpError.getResponse() as { retryAfterSeconds?: number };
        expect(response.retryAfterSeconds).toBeGreaterThan(0);
      }
    });
  });

  describe('checkEmail rate limiting', () => {
    it('should allow up to 30 requests per minute and block the 31st', () => {
      const ip = '192.168.1.50';

      for (let i = 0; i < 30; i++) {
        expect(() => service.assertCheckEmailRateLimit(ip)).not.toThrow();
      }

      expect(() => service.assertCheckEmailRateLimit(ip)).toThrow(HttpException);
    });
  });
});
