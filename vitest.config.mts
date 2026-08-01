import { defineConfig, mergeConfig } from 'vitest/config';

/**
 * Settings both lanes share. Exported so vitest.eval.config.mts merges them
 * rather than restating them — anything added here (setup files, aliases)
 * reaches both lanes without a second edit.
 *
 * `environment: 'node'` is deliberate: everything under test today is
 * server-side. Add jsdom (and a DOM-lane include) when the first component
 * test needs one.
 */
export const sharedConfig = defineConfig({
  resolve: {
    // Honours the `@/*` -> `./src/*` alias declared in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
  },
});

/**
 * Default lane: everything safe to run unattended. Deterministic, offline,
 * free. `*.eval.test.*` is excluded here and runs only via `npm run test:eval`.
 */
export default mergeConfig(
  sharedConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.ts'],
      exclude: ['**/node_modules/**', '**/*.eval.test.*'],
    },
  })
);
