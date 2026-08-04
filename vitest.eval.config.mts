import { defineConfig, mergeConfig } from 'vitest/config';

// The explicit `.mts` needs `allowImportingTsExtensions` in tsconfig.json,
// which is safe here because the project only ever typechecks with `noEmit`.
// This line previously read `./vitest.config.mjs` — a file that does not
// exist, which typechecked and would have failed the moment the lane ran.
import { sharedConfig } from './vitest.config.mts';

/**
 * Evaluation lane: deliberately invoked, never run unattended.
 *
 * These tests make real model calls, so they cost money and are
 * non-deterministic. Run with `npm run test:eval`.
 *
 * The timeouts and concurrency limits below arrived with the first eval test
 * that needed them (#12), as this file's previous revision said they should.
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

      // A single-pass read measured 3.4-4.2s. 60s leaves room for a cold
      // gateway, a slower model than the one measured, and a retry, while
      // still failing rather than hanging if the gateway stops responding.
      testTimeout: 60_000,
      // Drawings are read once per suite in `beforeAll` and shared by the
      // assertions, so the hook gets the same budget as a test.
      hookTimeout: 60_000,

      // One drawing at a time. Concurrency here buys a few seconds and costs
      // rate-limit errors that read as classification failures — the free
      // tier this lane currently runs on (#27) rate-limits aggressively.
      fileParallelism: false,
      maxConcurrency: 1,

      // Model output is non-deterministic; a retry would turn a real
      // classification regression into an intermittent pass. Failures here
      // are meant to be read, not re-rolled.
      retry: 0,
    },
  })
);
