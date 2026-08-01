import { defineConfig, mergeConfig } from 'vitest/config';

import { sharedConfig } from './vitest.config.mjs';

/**
 * Evaluation lane: deliberately invoked, never run unattended.
 *
 * These tests make real model calls, so they cost money and are
 * non-deterministic. Run with `npm run test:eval`.
 *
 * Kept minimal on purpose — the timeouts and concurrency limits that real
 * model calls need belong with the first eval test that needs them (#12),
 * not ahead of it.
 */
export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      include: ['src/**/*.eval.test.ts'],
      exclude: ['**/node_modules/**'],
      // No eval tests exist yet; the lane is wired ahead of the pipeline that
      // needs it, so an empty run is a success rather than a failure.
      passWithNoTests: true,
    },
  })
);
