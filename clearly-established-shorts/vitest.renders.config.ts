import { defineConfig } from 'vitest/config';

// Probes every file under out/. Run after `npm run render -- --all`.
export default defineConfig({
  test: {
    include: ['tests/renders/**/*.test.ts'],
    testTimeout: 1_800_000,
    hookTimeout: 1_800_000,
    fileParallelism: false,
  },
});
