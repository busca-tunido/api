import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    setupFiles: ['./test/vitest-setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    env: {
      DATABASE_URL:
        'mongodb+srv://emailjoseleiva_db_user:PX4TulkShfd038vL@busca-tunido.yevktbz.mongodb.net/buscatunido_test?retryWrites=true&w=majority',
      JWT_SECRET: 'test-jwt-secret-key-for-unit-tests',
      JWT_EXPIRES_IN: '7d',
      PORT: '4000',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
