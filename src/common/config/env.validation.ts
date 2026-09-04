export type Environment = 'development' | 'production' | 'test';

export type EnvironmentConfig = {
  PORT: number;
  DATABASE_URL: string;
  NODE_ENV: Environment;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
};

export const validateEnv = (config: Record<string, unknown>): EnvironmentConfig => {
  const nodeEnv = (config.NODE_ENV as Environment) || 'development';
  const allowedEnvs: Environment[] = ['development', 'production', 'test'];
  if (!allowedEnvs.includes(nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}. Must be one of ${allowedEnvs.join(', ')}`);
  }

  const rawPort = config.PORT ?? 3000;
  const port = Number(rawPort);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${rawPort}. Must be a valid port number.`);
  }

  const databaseUrl = config.DATABASE_URL as string | undefined;
  if (!databaseUrl || typeof databaseUrl !== 'string' || !databaseUrl.trim()) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const jwtSecret =
    (config.JWT_SECRET as string) || 'tunido-super-secure-secret-key-for-jwt-signing';
  const jwtExpiresIn = (config.JWT_EXPIRES_IN as string) || '7d';

  return {
    PORT: port,
    DATABASE_URL: databaseUrl.trim(),
    NODE_ENV: nodeEnv,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
  };
};
