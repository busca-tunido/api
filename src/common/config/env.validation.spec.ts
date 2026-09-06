import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  it('should validate valid environment configuration', () => {
    const config = {
      PORT: '3000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/buscatunido',
      NODE_ENV: 'development',
      JWT_SECRET: 'super-secret',
      JWT_EXPIRES_IN: '1d',
      CORS_ORIGIN: 'http://localhost:3000',
    };

    const validated = validateEnv(config);
    expect(validated.PORT).toBe(3000);
    expect(validated.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@localhost:5432/buscatunido',
    );
    expect(validated.NODE_ENV).toBe('development');
    expect(validated.JWT_SECRET).toBe('super-secret');
    expect(validated.JWT_EXPIRES_IN).toBe('1d');
    expect(validated.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('should accept JWT_EXPIRATION alias when JWT_EXPIRES_IN is omitted', () => {
    const config = {
      PORT: '4000',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/buscatunido',
      JWT_SECRET: 'super-secret',
      JWT_EXPIRATION: '7d',
    };

    const validated = validateEnv(config);
    expect(validated.PORT).toBe(4000);
    expect(validated.JWT_EXPIRES_IN).toBe('7d');
  });

  it('should throw if JWT_SECRET is missing or empty', () => {
    expect(() =>
      validateEnv({
        PORT: '4000',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/buscatunido',
        JWT_EXPIRATION: '7d',
      }),
    ).toThrow('JWT_SECRET environment variable is required.');
  });

  it('should throw if DATABASE_URL is missing or empty', () => {
    expect(() =>
      validateEnv({
        PORT: '4000',
        JWT_SECRET: 'secret',
        JWT_EXPIRATION: '7d',
      }),
    ).toThrow('DATABASE_URL environment variable is required.');
    expect(() =>
      validateEnv({
        PORT: '4000',
        DATABASE_URL: '   ',
        JWT_SECRET: 'secret',
        JWT_EXPIRATION: '7d',
      }),
    ).toThrow('DATABASE_URL environment variable is required.');
  });

  it('should throw if PORT is missing or invalid', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost:5432/db',
        JWT_SECRET: 'secret',
        JWT_EXPIRATION: '7d',
      }),
    ).toThrow('PORT environment variable is required.');

    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost:5432/db',
        PORT: 'invalid-port',
        JWT_SECRET: 'secret',
        JWT_EXPIRATION: '7d',
      }),
    ).toThrow('Invalid PORT');
  });

  it('should throw if NODE_ENV is not an allowed value', () => {
    expect(() =>
      validateEnv({
        PORT: '4000',
        DATABASE_URL: 'postgresql://localhost:5432/db',
        NODE_ENV: 'invalid_env',
        JWT_SECRET: 'secret',
        JWT_EXPIRATION: '7d',
      }),
    ).toThrow('Invalid NODE_ENV');
  });
});
