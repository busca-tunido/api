import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    testTimeout: 20000,
    env: {
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/buscatunido_test',
      JWT_SECRET: 'test-jwt-secret-key-for-unit-tests',
      JWT_EXPIRES_IN: '7d',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
