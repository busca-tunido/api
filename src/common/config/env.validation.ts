export type Environment = 'development' | 'production' | 'test';

export type EnvironmentConfig = {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: Environment;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
};

export const validateEnv = (config: Record<string, unknown>): EnvironmentConfig => {
  const nodeEnv = (config.NODE_ENV as Environment) || 'development';
  const allowedEnvs: Environment[] = ['development', 'production', 'test'];
  if (!allowedEnvs.includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be one of ${allowedEnvs.join(', ')}`);
  }

  const rawPort = config.PORT;
  if (rawPort === undefined || rawPort === null || rawPort === '') {
    throw new Error('PORT environment variable is required.');
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

  const rawExpiresIn = (config.JWT_EXPIRES_IN || config.JWT_EXPIRATION) as string | undefined;
  if (!rawExpiresIn || typeof rawExpiresIn !== 'string' || !rawExpiresIn.trim()) {
    throw new Error('JWT_EXPIRATION (or JWT_EXPIRES_IN) environment variable is required.');
  }

  const corsOrigin =
    (config.CORS_ORIGIN as string | undefined) ||
    'https://web-git-main-joseleivas-projects.vercel.app';

  return {
    PORT: port,
    DATABASE_URL: databaseUrl.trim(),
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret.trim(),
    JWT_EXPIRES_IN: rawExpiresIn.trim(),
    CORS_ORIGIN: corsOrigin.trim(),
  };
};
