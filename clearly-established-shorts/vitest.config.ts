import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/renders/**'],
    testTimeout: 600_000,
    hookTimeout: 600_000,
    fileParallelism: false,
    reporters: ['default'],
  },
});
