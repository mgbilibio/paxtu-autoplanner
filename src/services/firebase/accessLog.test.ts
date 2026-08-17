import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ACCESS_LOG_EMPTY_MESSAGE,
  APP_TIMEZONE,
  formatDateTimeCuiaba,
  formatDateTimeCuiabaOrDash,
  parseIsoField,
  parseRecentAccesses,
  prependAccess,
} from './accessLogFormat.ts';

describe('accessLog', () => {
  it('keeps America/Cuiaba as the display timezone', () => {
    assert.equal(APP_TIMEZONE, 'America/Cuiaba');
  });

  it('formats a known UTC instant in Cuiabá (UTC-4)', () => {
    const formatted = formatDateTimeCuiaba('2026-08-17T16:30:00.000Z');
    assert.match(formatted, /17\/08\/2026/);
    assert.match(formatted, /12:30/);
  });

  it('does not invent timestamps for empty values', () => {
    assert.equal(formatDateTimeCuiaba(null), '');
    assert.equal(formatDateTimeCuiaba(undefined), '');
    assert.equal(formatDateTimeCuiaba(''), '');
    assert.equal(formatDateTimeCuiaba('não-é-data'), '');
    assert.equal(formatDateTimeCuiabaOrDash(undefined), '—');
  });

  it('parses ISO and Date, ignores junk', () => {
    assert.equal(parseIsoField('2026-08-17T16:30:00.000Z'), '2026-08-17T16:30:00.000Z');
    assert.equal(parseIsoField(new Date('2026-08-17T16:30:00.000Z')), '2026-08-17T16:30:00.000Z');
    assert.equal(parseIsoField('xyz'), undefined);
    assert.equal(parseIsoField(42), undefined);
  });

  it('keeps the last N distinct accesses without fabricating entries', () => {
    assert.deepEqual(parseRecentAccesses(undefined), []);
    assert.deepEqual(parseRecentAccesses(['ruim', '2026-08-17T16:30:00.000Z', { at: '2026-08-16T10:00:00.000Z' }]), [
      '2026-08-17T16:30:00.000Z',
      '2026-08-16T10:00:00.000Z',
    ]);
  });

  it('prepends a new access and drops the oldest beyond the cap', () => {
    const first = prependAccess([], '2026-08-17T16:30:00.000Z');
    assert.deepEqual(first, ['2026-08-17T16:30:00.000Z']);
    const many = Array.from({ length: 10 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`);
    const next = prependAccess(many, '2026-08-17T18:00:00.000Z');
    assert.equal(next.length, 8);
    assert.equal(next[0], '2026-08-17T18:00:00.000Z');
  });

  it('exposes the empty-state copy for the first deploy', () => {
    assert.match(ACCESS_LOG_EMPTY_MESSAGE, /Ainda não há registros/);
  });
});
