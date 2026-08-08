/**
 * Application-wide structured logging.
 *
 * One JSON object per line, prefixed with the scope that emitted it, so a
 * platform log search can isolate one part of the app and `jq` can read a
 * captured run:
 *
 *   [drawing-extraction] {"level":"info","event":"extraction.start",...}
 *
 * No logging library: one `console` call per event does not justify a
 * dependency, and this stays swappable if that changes.
 *
 * Configure with `LOG_LEVEL` (`debug` | `info` | `warn` | `error` | `silent`).
 * Silent under vitest by default, so test output stays readable.
 *
 * **On what you put in a log line.** Fields go to wherever the platform ships
 * stdout. Keep personal data, customer document content, and anything covered
 * by a confidentiality term at `debug`, which is off unless someone turns it
 * on deliberately. Counts, lengths, ids, and decisions belong at `info`.
 */

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogFields = Record<string, unknown>;

export type Logger = {
  debug: (event: string, fields?: LogFields) => void;
  info: (event: string, fields?: LogFields) => void;
  warn: (event: string, fields?: LogFields) => void;
  error: (event: string, fields?: LogFields) => void;
  /** Milliseconds since this logger was created. */
  elapsed: () => number;
  /**
   * A logger for a nested scope, sharing this one's run id and clock — so a
   * request and the work it triggers stay correlated in a log search.
   */
  child: (scope: string) => Logger;
};

const RANK: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

const isLogLevel = (value: string): value is LogLevel =>
  (LOG_LEVELS as readonly string[]).includes(value);

export function resolveLogLevel(env: NodeJS.ProcessEnv = process.env): LogLevel {
  const configured = env.LOG_LEVEL?.trim().toLowerCase();
  if (configured && isLogLevel(configured)) return configured;
  // The test suites run thousands of code paths; per-event logging would bury
  // the assertions that failed. Set LOG_LEVEL to see them.
  if (env.NODE_ENV === 'test') return 'silent';
  return 'info';
}

/** Short, non-secret correlation id grouping the lines of one operation. */
const newRunId = (): string => Math.random().toString(36).slice(2, 10);

export type LogSink = (
  level: Exclude<LogLevel, 'silent'>,
  line: string
) => void;

export type CreateLoggerOptions = {
  /** Appears in the line prefix and in the payload, e.g. `drawing-extraction`. */
  scope: string;
  level?: LogLevel;
  runId?: string;
  /** Injection point for tests; defaults to the real console. */
  sink?: LogSink;
  /** Merged into every line — request ids, account ids, and the like. */
  base?: LogFields;
};

const consoleSink: LogSink = (level, line) => {
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export function createLogger(options: CreateLoggerOptions): Logger {
  const level = options.level ?? resolveLogLevel();
  const runId = options.runId ?? newRunId();
  const sink = options.sink ?? consoleSink;
  const base = options.base ?? {};
  const startedAt = Date.now();
  const threshold = RANK[level];

  const emit =
    (at: Exclude<LogLevel, 'silent'>) =>
    (event: string, fields: LogFields = {}): void => {
      if (RANK[at] < threshold) return;
      sink(
        at,
        `[${options.scope}] ${JSON.stringify({
          level: at,
          scope: options.scope,
          event,
          runId,
          ms: Date.now() - startedAt,
          ...base,
          ...fields,
        })}`
      );
    };

  return {
    debug: emit('debug'),
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    elapsed: () => Date.now() - startedAt,
    child: (scope) =>
      createLogger({ ...options, scope: `${options.scope}:${scope}`, runId }),
  };
}

/** Discards everything. For callers that want no output, and for tests. */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  elapsed: () => 0,
  child: () => silentLogger,
};
