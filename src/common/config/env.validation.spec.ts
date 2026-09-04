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
    };

    const validated = validateEnv(config);
    expect(validated.PORT).toBe(3000);
    expect(validated.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@localhost:5432/buscatunido',
    );
    expect(validated.NODE_ENV).toBe('development');
    expect(validated.JWT_SECRET).toBe('super-secret');
    expect(validated.JWT_EXPIRES_IN).toBe('1d');
  });

  it('should fallback to defaults for optional variables', () => {
    const config = {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/buscatunido',
    };

    const validated = validateEnv(config);
    expect(validated.PORT).toBe(3000);
    expect(validated.NODE_ENV).toBe('development');
    expect(typeof validated.JWT_SECRET).toBe('string');
  });

  it('should throw if DATABASE_URL is missing or empty', () => {
    expect(() => validateEnv({})).toThrow('DATABASE_URL environment variable is required.');
    expect(() => validateEnv({ DATABASE_URL: '   ' })).toThrow(
      'DATABASE_URL environment variable is required.',
    );
  });

  it('should throw if PORT is invalid', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost:5432/db',
        PORT: 'invalid-port',
      }),
    ).toThrow('Invalid PORT');
  });

  it('should throw if NODE_ENV is not an allowed value', () => {
    expect(() =>
      validateEnv({
        DATABASE_URL: 'postgresql://localhost:5432/db',
        NODE_ENV: 'invalid_env',
      }),
    ).toThrow('Invalid NODE_ENV');
  });
});
