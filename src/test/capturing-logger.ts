import { createLogger, type LogLevel } from '@/lib/logger';

/**
 * A logger that collects its lines as parsed objects instead of writing them,
 * so tests can assert on the fields rather than on formatted strings.
 *
 * Lives outside `*.test.ts` deliberately: the vitest lanes include only
 * `src/**\/*.test.ts`, so this is shared helper code rather than a suite that
 * gets collected and run.
 */
export function capturingLogger(
  scope = 'test-scope',
  level: LogLevel = 'debug'
) {
  const lines: Record<string, unknown>[] = [];

  const logger = createLogger({
    scope,
    level,
    runId: 'fixed-run-id',
    sink: (_at, line) =>
      lines.push(JSON.parse(line.slice(line.indexOf('] ') + 2))),
  });

  return {
    logger,
    lines,
    events: () => lines.map((line) => line.event),
    find: (event: string) => lines.find((line) => line.event === event),
  };
}
