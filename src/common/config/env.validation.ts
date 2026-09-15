export type Environment = 'development' | 'production' | 'test';

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

export const validateEnv = (config: Record<string, unknown>): EnvironmentConfig => {
  const nodeEnv = (config.NODE_ENV as Environment) || 'development';
  const allowedEnvs: Environment[] = ['development', 'production', 'test'];
  if (!allowedEnvs.includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be one of ${allowedEnvs.join(', ')}`);
  }

  const rawPort = config.PUBLIC_PORT ?? config.PORT;
  if (rawPort === undefined || rawPort === null || rawPort === '') {
    throw new Error('PUBLIC_PORT (or PORT) environment variable is required.');
  }
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${rawPort}. Must be a valid port number.`);
  }

  const databaseUrl = config.DATABASE_URL as string | undefined;
  if (!databaseUrl || typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const jwtSecret = config.JWT_SECRET as string | undefined;
  if (!jwtSecret || typeof jwtSecret !== 'string' || !jwtSecret.trim()) {
    throw new Error('JWT_SECRET environment variable is required.');
  }

  const rawExpiresIn = (config.PUBLIC_JWT_EXPIRATION ||
    config.PUBLIC_JWT_EXPIRES_IN ||
    config.JWT_EXPIRES_IN ||
    config.JWT_EXPIRATION) as string | undefined;
  if (!rawExpiresIn || typeof rawExpiresIn !== 'string' || !rawExpiresIn.trim()) {
    throw new Error(
      'PUBLIC_JWT_EXPIRATION (or JWT_EXPIRATION / JWT_EXPIRES_IN) environment variable is required.',
    );
  }

  const corsOrigin =
    ((config.PUBLIC_CORS_ORIGIN || config.CORS_ORIGIN) as string | undefined) ||
    'https://buscatunido.vercel.app';

  const awsEndpointUrlS3 = (config.PUBLIC_AWS_ENDPOINT_URL_S3 || config.AWS_ENDPOINT_URL_S3) as
    | string
    | undefined;
  const awsAccessKeyId = config.AWS_ACCESS_KEY_ID as string | undefined;
  const awsSecretAccessKey = config.AWS_SECRET_ACCESS_KEY as string | undefined;
  const awsRegion = (config.PUBLIC_AWS_REGION || config.AWS_REGION) as string | undefined;
  const storageBucket = (config.PUBLIC_STORAGE_BUCKET || config.STORAGE_BUCKET) as
    | string
    | undefined;
  const publicBaseUrl = (config.PUBLIC_NEON_STORAGE_BASE_URL ||
    config.NEON_STORAGE_PUBLIC_BASE_URL) as string | undefined;

  const moderatorEmail = (config.PUBLIC_MODERATOR_EMAIL || config.MODERATOR_EMAIL) as
    | string
    | undefined;
  const moderatorFirstName = (config.PUBLIC_MODERATOR_FIRST_NAME || config.MODERATOR_FIRST_NAME) as
    | string
    | undefined;
  const moderatorLastName = (config.PUBLIC_MODERATOR_LAST_NAME || config.MODERATOR_LAST_NAME) as
    | string
    | undefined;

  return {
    PORT: port,
    PUBLIC_PORT: port,
    DATABASE_URL: databaseUrl.trim(),
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret.trim(),
    JWT_EXPIRES_IN: rawExpiresIn.trim(),
    PUBLIC_JWT_EXPIRATION: rawExpiresIn.trim(),
    CORS_ORIGIN: corsOrigin.trim(),
    PUBLIC_CORS_ORIGIN: corsOrigin.trim(),
    PUBLIC_MODERATOR_EMAIL: moderatorEmail ? moderatorEmail.trim() : undefined,
    PUBLIC_MODERATOR_FIRST_NAME: moderatorFirstName ? moderatorFirstName.trim() : undefined,
    PUBLIC_MODERATOR_LAST_NAME: moderatorLastName ? moderatorLastName.trim() : undefined,
    PUBLIC_AWS_ENDPOINT_URL_S3: awsEndpointUrlS3 ? awsEndpointUrlS3.trim() : undefined,
    AWS_ENDPOINT_URL_S3: awsEndpointUrlS3 ? awsEndpointUrlS3.trim() : undefined,
    AWS_ACCESS_KEY_ID: awsAccessKeyId ? awsAccessKeyId.trim() : undefined,
    AWS_SECRET_ACCESS_KEY: awsSecretAccessKey ? awsSecretAccessKey.trim() : undefined,
    PUBLIC_AWS_REGION: awsRegion ? awsRegion.trim() : undefined,
    AWS_REGION: awsRegion ? awsRegion.trim() : undefined,
    PUBLIC_STORAGE_BUCKET: storageBucket ? storageBucket.trim() : undefined,
    STORAGE_BUCKET: storageBucket ? storageBucket.trim() : undefined,
    PUBLIC_NEON_STORAGE_BASE_URL: publicBaseUrl ? publicBaseUrl.trim() : undefined,
    NEON_STORAGE_PUBLIC_BASE_URL: publicBaseUrl ? publicBaseUrl.trim() : undefined,
  };
};
