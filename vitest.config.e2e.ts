import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    setupFiles: ['./test/vitest-setup.ts'],
    env: {
      DATABASE_URL:
        'mongodb+srv://emailjoseleiva_db_user:PX4TulkShfd038vL@busca-tunido.yevktbz.mongodb.net/buscatunido_test?retryWrites=true&w=majority',
      JWT_SECRET: 'test-jwt-secret-key-for-e2e-tests',
      JWT_EXPIRES_IN: '7d',
      PORT: '4001',
      CORS_ORIGIN: 'http://localhost:3000',
    },
  },
});
