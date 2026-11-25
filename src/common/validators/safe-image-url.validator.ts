import { registerDecorator, type ValidationOptions } from 'class-validator';
import { env } from '../../env.js';

export const isSafeImageUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return false;
  }

  if (trimmed.startsWith('/uploads/')) {
    return env.NODE_ENV !== 'production';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:') {
      return parsed.hostname.length > 0;
    }
    if (parsed.protocol === 'http:' && env.NODE_ENV !== 'production') {
      return (
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1' ||
        parsed.hostname.endsWith('.local')
      );
    }
    return false;
  } catch {
    return false;
  }
};

export function IsSafeImageUrl(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isSafeImageUrl',
      target: object.constructor,
      propertyName: String(propertyName),
      options: {
        message: 'Cada imagen debe ser una URL HTTPS válida',
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return isSafeImageUrl(value);
        },
      },
    });
  };
}
