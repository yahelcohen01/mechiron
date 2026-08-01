import { defineConfig } from 'vitest/config';

/**
 * Evaluation lane: deliberately invoked, never run in CI.
 *
 * These tests make real model calls, so they cost money and are
 * non-deterministic. Run them with `npm run test:eval` when you want to
 * measure extraction quality against fixture drawings.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.eval.test.ts'],
    exclude: ['**/node_modules/**'],
    // No eval tests exist yet; the lane is wired ahead of the pipeline that
    // needs it, so an empty run is a success rather than a failure.
    passWithNoTests: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Model calls are rate-limited; do not fan out across files.
    fileParallelism: false,
  },
});
