import { z } from 'zod';

export const environmentSchema = z.enum(['development', 'production', 'test']);
export type Environment = z.infer<typeof environmentSchema>;

export type EnvironmentConfig = {
  PORT: number;
  PUBLIC_PORT: number;
  DATABASE_URL: string;
  NODE_ENV: Environment;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PUBLIC_JWT_EXPIRATION: string;
  CORS_ORIGIN: string;
  PUBLIC_CORS_ORIGIN: string;
  MODERATOR_PASSWORD?: string;
  PUBLIC_MODERATOR_EMAIL?: string;
  PUBLIC_MODERATOR_FIRST_NAME?: string;
  PUBLIC_MODERATOR_LAST_NAME?: string;
  PUBLIC_AWS_ENDPOINT_URL_S3?: string;
  PUBLIC_AWS_REGION?: string;
  PUBLIC_STORAGE_BUCKET?: string;
  PUBLIC_NEON_STORAGE_BASE_URL?: string;
  AWS_ENDPOINT_URL_S3?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  STORAGE_BUCKET?: string;
  NEON_STORAGE_PUBLIC_BASE_URL?: string;
};

const envSchema = z
  .object({
    NODE_ENV: z
      .unknown()
      .refine((val): val is string => typeof val === 'string' && val.trim().length > 0, {
        message: 'NODE_ENV environment variable is required.',
      })
      .refine((val): val is Environment => ['development', 'production', 'test'].includes(val), {
        message: 'Invalid NODE_ENV. Must be one of development, production, test.',
      }),
    PORT: z
      .unknown()
      .refine((val) => val !== undefined && val !== null && val !== '', {
        message: 'PUBLIC_PORT (or PORT) environment variable is required.',
      })
      .transform((val, ctx) => {
        const num = Number(val);
        if (Number.isNaN(num) || num <= 0 || num > 65535) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid PORT: ${val}. Must be a valid port number.`,
          });
          return z.NEVER;
        }
        return num;
      }),
    DATABASE_URL: z
      .unknown()
      .refine((val): val is string => typeof val === 'string' && val.trim().length > 0, {
        message: 'DATABASE_URL environment variable is required.',
      })
      .transform((val) => val.trim()),
    JWT_SECRET: z
      .unknown()
      .refine((val): val is string => typeof val === 'string' && val.trim().length > 0, {
        message: 'JWT_SECRET environment variable is required.',
      })
      .transform((val) => val.trim()),
    PUBLIC_JWT_EXPIRATION: z
      .unknown()
      .refine((val): val is string => typeof val === 'string' && val.trim().length > 0, {
        message:
          'PUBLIC_JWT_EXPIRATION (or JWT_EXPIRATION / JWT_EXPIRES_IN) environment variable is required.',
      })
      .transform((val) => val.trim()),
    PUBLIC_CORS_ORIGIN: z
      .unknown()
      .refine((val): val is string => typeof val === 'string' && val.trim().length > 0, {
        message: 'PUBLIC_CORS_ORIGIN (or CORS_ORIGIN) environment variable is required.',
      })
      .transform((val) => val.trim()),
    MODERATOR_PASSWORD: z.string().trim().optional(),
    PUBLIC_MODERATOR_EMAIL: z.string().trim().optional(),
    PUBLIC_MODERATOR_FIRST_NAME: z.string().trim().optional(),
    PUBLIC_MODERATOR_LAST_NAME: z.string().trim().optional(),
    PUBLIC_AWS_ENDPOINT_URL_S3: z.string().trim().optional(),
    AWS_ACCESS_KEY_ID: z.string().trim().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().trim().optional(),
    PUBLIC_AWS_REGION: z.string().trim().optional(),
    PUBLIC_STORAGE_BUCKET: z.string().trim().optional(),
    PUBLIC_NEON_STORAGE_BASE_URL: z.string().trim().optional(),
  })

  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.PUBLIC_AWS_ENDPOINT_URL_S3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PUBLIC_AWS_ENDPOINT_URL_S3 environment variable is required in production.',
          path: ['PUBLIC_AWS_ENDPOINT_URL_S3'],
        });
      }
      if (!data.AWS_ACCESS_KEY_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AWS_ACCESS_KEY_ID environment variable is required in production.',
          path: ['AWS_ACCESS_KEY_ID'],
        });
      }
      if (!data.AWS_SECRET_ACCESS_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'AWS_SECRET_ACCESS_KEY environment variable is required in production.',
          path: ['AWS_SECRET_ACCESS_KEY'],
        });
      }
      if (!data.PUBLIC_AWS_REGION) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PUBLIC_AWS_REGION environment variable is required in production.',
          path: ['PUBLIC_AWS_REGION'],
        });
      }
      if (!data.PUBLIC_STORAGE_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PUBLIC_STORAGE_BUCKET environment variable is required in production.',
          path: ['PUBLIC_STORAGE_BUCKET'],
        });
      }
    }
  });

export const validateEnv = (config: Record<string, unknown>): EnvironmentConfig => {
  const normalized = {
    NODE_ENV: config.NODE_ENV,
    PORT: config.PUBLIC_PORT ?? config.PORT,
    DATABASE_URL: config.DATABASE_URL,
    JWT_SECRET: config.JWT_SECRET,
    PUBLIC_JWT_EXPIRATION:
      config.PUBLIC_JWT_EXPIRATION ||
      config.PUBLIC_JWT_EXPIRES_IN ||
      config.JWT_EXPIRES_IN ||
      config.JWT_EXPIRATION,
    PUBLIC_CORS_ORIGIN: config.PUBLIC_CORS_ORIGIN || config.CORS_ORIGIN,
    MODERATOR_PASSWORD: config.MODERATOR_PASSWORD,
    PUBLIC_MODERATOR_EMAIL: config.PUBLIC_MODERATOR_EMAIL || config.MODERATOR_EMAIL,
    PUBLIC_MODERATOR_FIRST_NAME: config.PUBLIC_MODERATOR_FIRST_NAME || config.MODERATOR_FIRST_NAME,
    PUBLIC_MODERATOR_LAST_NAME: config.PUBLIC_MODERATOR_LAST_NAME || config.MODERATOR_LAST_NAME,
    PUBLIC_AWS_ENDPOINT_URL_S3: config.PUBLIC_AWS_ENDPOINT_URL_S3 || config.AWS_ENDPOINT_URL_S3,
    AWS_ACCESS_KEY_ID: config.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: config.AWS_SECRET_ACCESS_KEY,
    PUBLIC_AWS_REGION: config.PUBLIC_AWS_REGION || config.AWS_REGION,
    PUBLIC_STORAGE_BUCKET: config.PUBLIC_STORAGE_BUCKET || config.STORAGE_BUCKET,
    PUBLIC_NEON_STORAGE_BASE_URL:
      config.PUBLIC_NEON_STORAGE_BASE_URL || config.NEON_STORAGE_PUBLIC_BASE_URL,
  };

  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => issue.message);
    const combinedMessage = errorMessages.join('\n');
    console.error(`[BuscaTuNido env error] Invalid environment variables:\n${combinedMessage}`);
    throw new Error(errorMessages[0]);
  }

  const data = result.data;
  const port = data.PORT;
  const corsOrigin = data.PUBLIC_CORS_ORIGIN;
  const expiresIn = data.PUBLIC_JWT_EXPIRATION;
  const awsEndpointUrlS3 = data.PUBLIC_AWS_ENDPOINT_URL_S3 || undefined;
  const awsAccessKeyId = data.AWS_ACCESS_KEY_ID || undefined;
  const awsSecretAccessKey = data.AWS_SECRET_ACCESS_KEY || undefined;
  const awsRegion = data.PUBLIC_AWS_REGION || undefined;
  const storageBucket = data.PUBLIC_STORAGE_BUCKET || undefined;
  const publicBaseUrl = data.PUBLIC_NEON_STORAGE_BASE_URL || undefined;

  return {
    PORT: port,
    PUBLIC_PORT: port,
    DATABASE_URL: data.DATABASE_URL,
    NODE_ENV: data.NODE_ENV,
    JWT_SECRET: data.JWT_SECRET,
    JWT_EXPIRES_IN: expiresIn,
    PUBLIC_JWT_EXPIRATION: expiresIn,
    CORS_ORIGIN: corsOrigin,
    PUBLIC_CORS_ORIGIN: corsOrigin,
    MODERATOR_PASSWORD: data.MODERATOR_PASSWORD || undefined,
    PUBLIC_MODERATOR_EMAIL: data.PUBLIC_MODERATOR_EMAIL || undefined,
    PUBLIC_MODERATOR_FIRST_NAME: data.PUBLIC_MODERATOR_FIRST_NAME || undefined,
    PUBLIC_MODERATOR_LAST_NAME: data.PUBLIC_MODERATOR_LAST_NAME || undefined,
    PUBLIC_AWS_ENDPOINT_URL_S3: awsEndpointUrlS3,
    AWS_ENDPOINT_URL_S3: awsEndpointUrlS3,
    AWS_ACCESS_KEY_ID: awsAccessKeyId,
    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey,
    PUBLIC_AWS_REGION: awsRegion,
    AWS_REGION: awsRegion,
    PUBLIC_STORAGE_BUCKET: storageBucket,
    STORAGE_BUCKET: storageBucket,
    PUBLIC_NEON_STORAGE_BASE_URL: publicBaseUrl,
    NEON_STORAGE_PUBLIC_BASE_URL: publicBaseUrl,
  };
};
