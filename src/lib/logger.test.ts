import { describe, expect, it } from 'vitest';

import { createLogger, resolveLogLevel, silentLogger } from '@/lib/logger';
import { capturingLogger } from '@/test/capturing-logger';

describe('resolveLogLevel', () => {
  it('is silent under vitest so test output stays readable', () => {
    expect(resolveLogLevel({ NODE_ENV: 'test' })).toBe('silent');
  });

  it('defaults to info outside tests', () => {
    expect(resolveLogLevel({ NODE_ENV: 'production' })).toBe('info');
  });

  it('honours LOG_LEVEL, case-insensitively and with stray whitespace', () => {
    expect(resolveLogLevel({ NODE_ENV: 'test', LOG_LEVEL: ' DEBUG ' })).toBe(
      'debug'
    );
  });

  it('ignores a level it does not recognise rather than crashing', () => {
    expect(resolveLogLevel({ NODE_ENV: 'production', LOG_LEVEL: 'loud' })).toBe(
      'info'
    );
  });
});

describe('createLogger', () => {
  it('suppresses everything below the configured level', () => {
    const { logger, events } = capturingLogger('test-scope', 'warn');
    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');
    expect(events()).toEqual(['c', 'd']);
  });

  it('emits nothing at all when silent', () => {
    const { logger, lines } = capturingLogger('test-scope', 'silent');
    logger.error('boom');
    expect(lines).toEqual([]);
  });

  it('prefixes the line with the scope so log search can filter on it', () => {
    const emitted: string[] = [];
    createLogger({
      scope: 'billing',
      level: 'info',
      sink: (_at, line) => emitted.push(line),
    }).info('charged');

    expect(emitted[0].startsWith('[billing] ')).toBe(true);
    expect(JSON.parse(emitted[0].slice('[billing] '.length))).toMatchObject({
      scope: 'billing',
      event: 'charged',
      level: 'info',
    });
  });

  it('tags every line with the run id so one operation can be grouped', () => {
    const { logger, lines } = capturingLogger();
    logger.info('a');
    logger.info('b');
    expect(lines.every((line) => line.runId === 'fixed-run-id')).toBe(true);
  });

  it('merges base fields into every line', () => {
    const emitted: Record<string, unknown>[] = [];
    createLogger({
      scope: 's',
      level: 'info',
      base: { accountId: 'acc_1' },
      sink: (_at, line) => emitted.push(JSON.parse(line.slice(line.indexOf('] ') + 2))),
    }).info('x');

    expect(emitted[0].accountId).toBe('acc_1');
  });

  it('lets a per-event field override a base field', () => {
    const emitted: Record<string, unknown>[] = [];
    createLogger({
      scope: 's',
      level: 'info',
      base: { step: 'one' },
      sink: (_at, line) => emitted.push(JSON.parse(line.slice(line.indexOf('] ') + 2))),
    }).info('x', { step: 'two' });

    expect(emitted[0].step).toBe('two');
  });

  it('routes warn and error away from stdout', () => {
    const seen: string[] = [];
    const logger = createLogger({
      scope: 's',
      level: 'debug',
      sink: (at) => seen.push(at),
    });
    logger.info('a');
    logger.warn('b');
    logger.error('c');
    expect(seen).toEqual(['info', 'warn', 'error']);
  });
});

describe('child loggers', () => {
  it('nests the scope and keeps the parent run id', () => {
    const emitted: Record<string, unknown>[] = [];
    const parent = createLogger({
      scope: 'request',
      level: 'info',
      runId: 'shared',
      sink: (_at, line) => emitted.push(JSON.parse(line.slice(line.indexOf('] ') + 2))),
    });

    parent.child('drawing-extraction').info('started');

    expect(emitted[0]).toMatchObject({
      scope: 'request:drawing-extraction',
      runId: 'shared',
    });
  });

  it('carries the parent level and base fields down', () => {
    const emitted: Record<string, unknown>[] = [];
    const parent = createLogger({
      scope: 'request',
      level: 'error',
      base: { requestId: 'req_1' },
      sink: (_at, line) => emitted.push(JSON.parse(line.slice(line.indexOf('] ') + 2))),
    });

    const child = parent.child('work');
    child.info('ignored');
    child.error('kept');

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ event: 'kept', requestId: 'req_1' });
  });
});

describe('silentLogger', () => {
  it('discards everything, including through children', () => {
    expect(() => {
      silentLogger.error('x');
      silentLogger.child('y').error('z');
    }).not.toThrow();
    expect(silentLogger.elapsed()).toBe(0);
  });
});
