import { defineConfig } from 'vitest/config';

/**
 * Default lane: everything that is safe to run in CI.
 *
 * Deterministic, offline, free. `*.eval.test.ts` is excluded here and runs
 * only via `npm run test:eval` (see vitest.eval.config.mts).
 */
export default defineConfig({
  resolve: {
    // Honours the `@/*` -> `./src/*` alias declared in tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/*.eval.test.ts'],
  },
});
