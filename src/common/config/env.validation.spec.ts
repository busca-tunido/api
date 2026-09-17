import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation.js';

describe('validateEnv', () => {
  const baseValidConfig = {
    PORT: '4000',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/buscatunido',
    NODE_ENV: 'development',
    JWT_SECRET: 'super-secret',
    JWT_EXPIRES_IN: '7d',
    CORS_ORIGIN: 'http://localhost:3000',
  };

  it('should validate valid environment configuration in development', () => {
    const validated = validateEnv(baseValidConfig);
    expect(validated.PORT).toBe(4000);
    expect(validated.DATABASE_URL).toBe(
      'postgresql://postgres:postgres@localhost:5432/buscatunido',
    );
    expect(validated.NODE_ENV).toBe('development');
    expect(validated.JWT_SECRET).toBe('super-secret');
    expect(validated.JWT_EXPIRES_IN).toBe('7d');
    expect(validated.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('should accept JWT_EXPIRATION alias when JWT_EXPIRES_IN is omitted', () => {
    const config = {
      ...baseValidConfig,
      JWT_EXPIRES_IN: undefined,
      JWT_EXPIRATION: '7d',
    };

    const validated = validateEnv(config);
    expect(validated.PORT).toBe(4000);
    expect(validated.JWT_EXPIRES_IN).toBe('7d');
  });

  it('should throw if NODE_ENV is missing or empty', () => {
    const config = { ...baseValidConfig, NODE_ENV: undefined };
    expect(() => validateEnv(config)).toThrow('NODE_ENV environment variable is required.');
  });

  it('should throw if NODE_ENV is not an allowed value', () => {
    const config = { ...baseValidConfig, NODE_ENV: 'invalid_env' };
    expect(() => validateEnv(config)).toThrow('Invalid NODE_ENV');
  });

  it('should throw if CORS_ORIGIN and PUBLIC_CORS_ORIGIN are missing', () => {
    const config = { ...baseValidConfig, CORS_ORIGIN: undefined, PUBLIC_CORS_ORIGIN: undefined };
    expect(() => validateEnv(config)).toThrow(
      'PUBLIC_CORS_ORIGIN (or CORS_ORIGIN) environment variable is required.',
    );
  });

  it('should throw if JWT_SECRET is missing or empty', () => {
    const config = { ...baseValidConfig, JWT_SECRET: undefined };
    expect(() => validateEnv(config)).toThrow('JWT_SECRET environment variable is required.');
  });

  it('should throw if DATABASE_URL is missing or empty', () => {
    expect(() => validateEnv({ ...baseValidConfig, DATABASE_URL: undefined })).toThrow(
      'DATABASE_URL environment variable is required.',
    );
    expect(() => validateEnv({ ...baseValidConfig, DATABASE_URL: '   ' })).toThrow(
      'DATABASE_URL environment variable is required.',
    );
  });

  it('should throw if PORT is missing or invalid', () => {
    expect(() =>
      validateEnv({ ...baseValidConfig, PORT: undefined, PUBLIC_PORT: undefined }),
    ).toThrow('PUBLIC_PORT (or PORT) environment variable is required.');
    expect(() => validateEnv({ ...baseValidConfig, PORT: 'invalid-port' })).toThrow('Invalid PORT');
  });

  it('should require AWS storage variables in production mode', () => {
    const prodConfig = {
      ...baseValidConfig,
      NODE_ENV: 'production',
    };
    expect(() => validateEnv(prodConfig)).toThrow(
      'PUBLIC_AWS_ENDPOINT_URL_S3 environment variable is required in production.',
    );
  });

  it('should pass in production mode when all storage variables are provided', () => {
    const prodConfig = {
      ...baseValidConfig,
      NODE_ENV: 'production',
      PUBLIC_AWS_ENDPOINT_URL_S3: 'https://branch.storage.c-2.us-east-2.aws.neon.tech',
      AWS_ACCESS_KEY_ID: 'neon-key',
      AWS_SECRET_ACCESS_KEY: 'neon-secret',
      PUBLIC_AWS_REGION: 'us-east-2',
      PUBLIC_STORAGE_BUCKET: 'uploads',
    };
    const validated = validateEnv(prodConfig);
    expect(validated.NODE_ENV).toBe('production');
    expect(validated.PUBLIC_AWS_ENDPOINT_URL_S3).toBe(
      'https://branch.storage.c-2.us-east-2.aws.neon.tech',
    );
  });
});
