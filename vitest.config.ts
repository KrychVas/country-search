import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '.vite-cache',
  test: {
    pool: 'threads',
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
  },
});
